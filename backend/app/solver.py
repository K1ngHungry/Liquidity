from typing import List, Optional, Literal, Dict, Any, Union
from pydantic import BaseModel, Field
from ortools.sat.python import cp_model
import logging
import ast
import operator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. The Schema (The Protocol) ---

class VariableDefinition(BaseModel):
    name: str
    lower_bound: int
    upper_bound: int

class ObjectiveDefinition(BaseModel):
    expression: str
    direction: Literal["maximize", "minimize"]

class SolverRequest(BaseModel):
    """
    The Intermediate Representation (IR) that the LLM must generate.
    """
    variables: List[VariableDefinition]
    constraints: List[str]  # e.g. "2 * x + 7 * y <= 50"
    objective: Optional[ObjectiveDefinition] = None

class SolverResponse(BaseModel):
    status: str
    objective_value: Optional[float] = None
    solution: Dict[str, int] = {}
    wall_time: float

# --- 2. The Builder (Python Engine) ---

def safe_eval_ast(expression: str, variables: Dict[str, Any]) -> Any:
    """
    Safely evaluate a mathematical expression using AST parsing.
    Only allows basic arithmetic, comparisons, and variable lookups.
    """
    # map AST operators to python operators
    ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.Lt: operator.lt,
        ast.LtE: operator.le,
        ast.Gt: operator.gt,
        ast.GtE: operator.ge,
    }

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):  # Numbers
            return node.value
        elif isinstance(node, ast.Name):  # Variables
            if node.id in variables:
                return variables[node.id]
            raise ValueError(f"Unknown variable: '{node.id}'")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            if type(node.op) in ops:
                return ops[type(node.op)](left, right)
            raise ValueError(f"Unsupported operator: {type(node.op)}")
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            if type(node.op) in ops:
                return ops[type(node.op)](operand)
            raise ValueError(f"Unsupported unary operator: {type(node.op)}")
        elif isinstance(node, ast.Compare):
            left = _eval(node.left)
            # Python's a < b < c is represented as left=a, ops=[<, <], comparators=[b, c]
            # But OR-Tools expressions typically don't support chained comparisons directly in one object usually.
            # However, for simple constraint strings like "x < 5", there is 1 op and 1 comparator.
            if len(node.ops) != 1 or len(node.comparators) != 1:
                 raise ValueError("Only single comparisons are supported (e.g., a < b). Chained comparisons (a < b < c) are not.")
            
            op = node.ops[0]
            right = _eval(node.comparators[0])
            
            if type(op) in ops:
                return ops[type(op)](left, right)
            raise ValueError(f"Unsupported comparison operator: {type(op)}")
        else:
            raise ValueError(f"Unsupported syntax: {type(node)}")

    try:
        tree = ast.parse(expression, mode='eval')
        return _eval(tree)
    except Exception as e:
        raise ValueError(f"Failed to safe-eval expression '{expression}': {e}")


class DynamicSolver:
    def __init__(self):
        pass

    def solve(self, request: SolverRequest) -> SolverResponse:
        # Reset state for each run to prevent accumulation
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.vars: Dict[str, cp_model.IntVar] = {}

        try:
            # A. Create Variables
            for var_def in request.variables:
                if not var_def.name.isidentifier():
                    raise ValueError(f"Invalid variable name: '{var_def.name}'. Must be a valid Python identifier.")
                if var_def.name in self.vars:
                    raise ValueError(f"Duplicate variable name: '{var_def.name}'.")

                self.vars[var_def.name] = self.model.NewIntVar(
                    var_def.lower_bound, 
                    var_def.upper_bound, 
                    var_def.name
                )
            
            # B. Apply Constraints
            for constraint_str in request.constraints:
                # This evaluates strings like "2 * x + 5 * y <= 100" into OR-Tools LinearExpr objects
                # and adds them to the model
                try:
                    constraint_expr = safe_eval_ast(constraint_str, self.vars)
                    self.model.Add(constraint_expr)
                except Exception as e:
                    logger.error(f"Failed to parse constraint '{constraint_str}': {e}")
                    raise ValueError(f"Invalid constraint format: {constraint_str}")

            # D. Set Objective
            if request.objective:
                obj_expr = safe_eval_ast(request.objective.expression, self.vars)
                if request.objective.direction == "maximize":
                    self.model.Maximize(obj_expr)
                else:
                    self.model.Minimize(obj_expr)

            # E. Solve
            status = self.solver.Solve(self.model)
            status_name = self.solver.StatusName(status)
            
            # F. Extract Results
            solution = {}
            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                for name, var in self.vars.items():
                    solution[name] = self.solver.Value(var)
                
            return SolverResponse(
                status=status_name,
                objective_value=self.solver.ObjectiveValue() if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None,
                solution=solution,
                wall_time=self.solver.WallTime()
            )

        except Exception as e:
            logger.error(f"Solver failed: {e}")
            return SolverResponse(status="ERROR", wall_time=0.0)

# --- 3. Example Usage ---

def solve_from_json(json_data: Dict[str, Any]) -> SolverResponse:
    """Helper to parse raw dict/json into Pydantic model and solve."""
    try:
        request = SolverRequest(**json_data)
        engine = DynamicSolver()
        return engine.solve(request)
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return SolverResponse(status=f"VALIDATION_ERROR: {str(e)}", wall_time=0.0)

if __name__ == "__main__":
    # Simulate what the LLM (Translator) would output for the problem:
    # "Maximize 2x + 2y + 3z given that:
    #  x, y, z are roughly under 50.
    #  2x + 7y + 3z <= 50, ..."
    
    llm_output_example = {
        "variables": [
            {"name": "x", "lower_bound": 0, "upper_bound": 50},
            {"name": "y", "lower_bound": 0, "upper_bound": 50},
            {"name": "z", "lower_bound": 0, "upper_bound": 50}
        ],
        "constraints": [
            "2 * x + 7 * y + 3 * z <= 50",
            "3 * x - 5 * y + 7 * z <= 45", 
            "5 * x + 2 * y - 6 * z <= 37"
        ],
        "objective": {
            "expression": "2 * x + 2 * y + 3 * z",
            "direction": "maximize"
        }
    }

    print("--- 1. Received LLM JSON Payload ---")
    print(llm_output_example)

    print("\n--- 2. Running Dynamic Solver ---")
    result = solve_from_json(llm_output_example)

    print("\n--- 3. Solver Result ---")
    print(f"Status: {result.status}")
    print(f"Objective Value: {result.objective_value}")
    print(f"Solution: {result.solution}")

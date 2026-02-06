from typing import List, Optional, Literal, Dict, Any, Union
from pydantic import BaseModel, Field
from ortools.sat.python import cp_model
import logging

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

class DynamicSolver:
    def __init__(self):
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.vars: Dict[str, cp_model.IntVar] = {}

    def solve(self, request: SolverRequest) -> SolverResponse:
        try:
            # A. Create Variables
            for var_def in request.variables:
                self.vars[var_def.name] = self.model.NewIntVar(
                    var_def.lower_bound, 
                    var_def.upper_bound, 
                    var_def.name
                )
            
            # B. Create Safe Evaluation Context
            # We restrict eval() to only access the variables we just created
            eval_globals = {"__builtins__": {}}
            eval_locals = self.vars.copy()

            # C. Apply Constraints
            for constraint_str in request.constraints:
                # This evaluates strings like "2 * x + 5 * y <= 100" into OR-Tools LinearExpr objects
                # and adds them to the model
                try:
                    # In CP-SAT, logical expressions evaluate to BoundedLinearExpression
                    constraint_expr = eval(constraint_str, eval_globals, eval_locals)
                    self.model.Add(constraint_expr)
                except Exception as e:
                    logger.error(f"Failed to parse constraint '{constraint_str}': {e}")
                    raise ValueError(f"Invalid constraint format: {constraint_str}")

            # D. Set Objective
            if request.objective:
                obj_expr = eval(request.objective.expression, eval_globals, eval_locals)
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
                objective_value=self.solver.ObjectiveValue() if status != cp_model.UNKNOWN else None,
                solution=solution,
                wall_time=self.solver.WallTime()
            )

        except Exception as e:
            logger.error(f"Solver failed: {e}")
            return SolverResponse(status="ERROR", wall_time=0.0)

# --- 3. Example Usage ---

def solve_from_json(json_data: Dict[str, Any]) -> SolverResponse:
    """Helper to parse raw dict/json into Pydantic model and solve."""
    request = SolverRequest(**json_data)
    engine = DynamicSolver()
    return engine.solve(request)

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

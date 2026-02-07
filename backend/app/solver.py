from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, model_validator
from ortools.sat.python import cp_model
import logging
import ast
import operator

logger = logging.getLogger(__name__)

# --- 1. The Schema (The Protocol) ---

class VariableDefinition(BaseModel):
    name: str
    lower_bound: int
    upper_bound: int

    @model_validator(mode='after')
    def check_bounds(self) -> 'VariableDefinition':
        if self.lower_bound > self.upper_bound:
            raise ValueError(
                f"lower_bound must be <= upper_bound "
                f"(got lower_bound={self.lower_bound}, upper_bound={self.upper_bound})"
            )
        return self

class ObjectiveDefinition(BaseModel):
    expression: str
    direction: Literal["maximize", "minimize"]

class ConstraintDefinition(BaseModel):
    """A single constraint with hard/soft classification and priority."""
    expression: str              # e.g. "dining <= 500"
    constraint_type: Literal["hard", "soft"] = "hard"
    priority: int = 0            # lower number = higher priority (soft only)
    description: str = ""        # human-readable label

class SolverRequest(BaseModel):
    """
    The Intermediate Representation (IR) that the LLM must generate.
    """
    variables: List[VariableDefinition]
    constraints: List[ConstraintDefinition]
    objective: Optional[ObjectiveDefinition] = None

class SolverResponse(BaseModel):
    status: str
    objective_value: Optional[float] = None
    solution: Dict[str, int] = Field(default_factory=dict)
    wall_time: float
    satisfied_constraints: List[str] = Field(default_factory=list)
    dropped_constraints: List[str] = Field(default_factory=list)

# --- 2. The Builder (Python Engine) ---

def safe_eval_ast(expression: str, variables: Dict[str, Any]) -> Any:
    """
    Safely evaluate a mathematical expression using AST parsing.
    Only allows linear arithmetic (addition, subtraction, multiplication),
    comparisons, and variable lookups. Division, modulo, and power operations
    are not supported for OR-Tools IntVar.
    """
    # map AST operators to python operators
    # Note: Only linear arithmetic operations are supported for OR-Tools IntVar
    ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
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
        elif isinstance(node, ast.Constant):  # Integer constants only
            # Explicitly reject bool (which is a subclass of int in Python)
            if isinstance(node.value, bool):
                raise TypeError(f"Non-numeric literal: {node.value!r} (type: bool)")
            # CP-SAT operates on integers — reject float and complex
            if not isinstance(node.value, int):
                raise TypeError(
                    f"Only integer constants are supported for CP-SAT, "
                    f"got {node.value!r} (type: {type(node.value).__name__})"
                )
            return node.value
        elif isinstance(node, ast.Name):  # Variables
            if node.id in variables:
                return variables[node.id]
            raise ValueError(f"Unknown variable: '{node.id}'")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            if type(node.op) not in ops:
                raise ValueError(f"Unsupported operator: {type(node.op)}")
            # CP-SAT requires linear expressions: multiplication must have
            # at least one integer constant operand (no variable * variable).
            if isinstance(node.op, ast.Mult):
                if not (isinstance(left, int) or isinstance(right, int)):
                    raise ValueError(
                        "Non-linear multiplication: at least one operand must "
                        "be an integer constant (variable * variable is not allowed)"
                    )
            return ops[type(node.op)](left, right)
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

    def _build_model(
        self,
        request: SolverRequest,
        soft_to_include: List[ConstraintDefinition],
    ) -> None:
        """Build a fresh CP-SAT model with the given hard + selected soft constraints."""
        self.model = cp_model.CpModel()
        self.vars = {}

        for var_def in request.variables:
            if not var_def.name.isidentifier():
                raise ValueError(f"Invalid variable name: '{var_def.name}'.")
            if var_def.name in self.vars:
                raise ValueError(f"Duplicate variable name: '{var_def.name}'.")
            self.vars[var_def.name] = self.model.NewIntVar(
                var_def.lower_bound, var_def.upper_bound, var_def.name
            )

        # Hard constraints (always included)
        for c in request.constraints:
            if c.constraint_type == "hard":
                constraint_expr = safe_eval_ast(c.expression, self.vars)
                self.model.Add(constraint_expr)

        # Selected soft constraints
        for c in soft_to_include:
            constraint_expr = safe_eval_ast(c.expression, self.vars)
            self.model.Add(constraint_expr)

        if request.objective:
            obj_expr = safe_eval_ast(request.objective.expression, self.vars)
            if request.objective.direction == "maximize":
                self.model.Maximize(obj_expr)
            else:
                self.model.Minimize(obj_expr)

    def solve(self, request: SolverRequest) -> SolverResponse:
        self.solver = cp_model.CpSolver()
        self.vars: Dict[str, cp_model.IntVar] = {}

        try:
            # Separate hard and soft constraints
            soft_constraints = sorted(
                [c for c in request.constraints if c.constraint_type == "soft"],
                key=lambda c: c.priority,  # lower number = higher priority
            )
            active_soft = list(soft_constraints)
            dropped: List[ConstraintDefinition] = []

            # Try with all soft constraints first, then iteratively drop lowest-priority
            while True:
                self._build_model(request, active_soft)
                status = self.solver.Solve(self.model)

                if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                    break

                # Infeasible — drop the lowest-priority soft constraint
                if not active_soft:
                    break  # nothing left to drop
                removed = active_soft.pop()  # highest priority number = lowest priority
                dropped.append(removed)
                logger.info(f"Dropping soft constraint (priority {removed.priority}): {removed.expression}")

            status_name = self.solver.StatusName(status)
            feasible = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

            solution = {}
            satisfied: List[str] = []
            if feasible:
                for name, var in self.vars.items():
                    solution[name] = self.solver.Value(var)
                satisfied = (
                    [c.description or c.expression for c in request.constraints if c.constraint_type == "hard"]
                    + [c.description or c.expression for c in active_soft]
                )

            return SolverResponse(
                status=status_name,
                objective_value=self.solver.ObjectiveValue() if feasible else None,
                solution=solution,
                wall_time=self.solver.WallTime(),
                satisfied_constraints=satisfied,
                dropped_constraints=[c.description or c.expression for c in dropped],
            )

        except Exception as e:
            logger.error(f"Solver failed: {e}")
            return SolverResponse(status="ERROR", wall_time=0.0)

# --- 3. Example Usage ---

def solve_from_json(json_data: Dict[str, Any]) -> SolverResponse:
    """
    Solve a constraint satisfaction or optimization problem using OR-Tools CP-SAT solver.

    Supports linear integer programming with variables, constraints, and optional objectives.
    Only linear arithmetic (addition, subtraction, multiplication) and comparison operators
    are supported.

    Args:
        json_data: Problem specification containing:
            - variables: List of VariableDefinition dicts, each with:
                - name (str): Valid Python identifier for the variable.
                - lower_bound (int): Minimum integer value.
                - upper_bound (int): Maximum integer value (must be >= lower_bound).
            - constraints: List of ConstraintDefinition dicts, each with:
                - expression (str): Math expression using variable names and
                  comparators. Valid comparators: ``<=``, ``>=``, ``==``, ``<``,
                  ``>``, ``!=``. Example: ``"2 * x + 7 * y <= 50"``.
                - constraint_type (str): ``"hard"`` (must be satisfied) or
                  ``"soft"`` (preference, may be dropped). Default ``"hard"``.
                - priority (int): Priority tier for soft constraints; lower
                  number = higher priority. Ignored for hard constraints.
                  Default ``0``.
                - description (str): Human-readable label. Default ``""``.
            - objective: Optional ObjectiveDefinition dict with:
                - expression (str): Expression to optimize (e.g. ``"savings"``).
                - direction (str): ``"maximize"`` or ``"minimize"``.

    Returns:
        SolverResponse with status, objective_value, solution dict, wall_time,
        satisfied_constraints, and dropped_constraints.
    """
    try:
        request = SolverRequest(**json_data)
        engine = DynamicSolver()
        return engine.solve(request)
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return SolverResponse(status=f"VALIDATION_ERROR: {str(e)}", wall_time=0.0)


def solve_constraint_problem(
    variables: List[Dict[str, Any]],
    constraints: List[Dict[str, Any]],
    objective_expression: Optional[str] = None,
    objective_direction: Optional[Literal["maximize", "minimize"]] = None
) -> Dict[str, Any]:
    """
    Solve a constraint satisfaction or optimization problem using OR-Tools.

    Args:
        variables: List of variable definitions. Each dict must have:
            - name: Variable name (valid Python identifier)
            - lower_bound: Minimum integer value
            - upper_bound: Maximum integer value
        constraints: List of constraint definitions. Each dict must have:
            - expression: Constraint string (e.g., "2 * x + 7 * y <= 50")
            - constraint_type: "hard" or "soft" (default "hard")
            - priority: int, lower = higher priority (soft only, default 0)
            - description: human-readable label (default "")
        objective_expression: Optional expression to optimize
        objective_direction: "maximize" or "minimize"

    Returns:
        Dict with status, objective_value, solution, wall_time,
        satisfied_constraints, and dropped_constraints.
    """
    json_data: Dict[str, Any] = {
        "variables": variables,
        "constraints": constraints,
    }

    if objective_expression is not None:
        if objective_direction is None:
            raise ValueError("objective_direction must be provided when objective_expression is specified")
        json_data["objective"] = {
            "expression": objective_expression,
            "direction": objective_direction,
        }

    result = solve_from_json(json_data)

    return {
        "status": result.status,
        "objective_value": result.objective_value,
        "solution": result.solution,
        "wall_time": result.wall_time,
        "satisfied_constraints": result.satisfied_constraints,
        "dropped_constraints": result.dropped_constraints,
    }


if __name__ == "__main__":
    # Budget example: monthly income $5000, allocate across categories
    llm_output_example = {
        "variables": [
            {"name": "housing", "lower_bound": 0, "upper_bound": 5000},
            {"name": "dining", "lower_bound": 0, "upper_bound": 5000},
            {"name": "savings", "lower_bound": 0, "upper_bound": 5000},
            {"name": "transport", "lower_bound": 0, "upper_bound": 5000},
            {"name": "entertainment", "lower_bound": 0, "upper_bound": 5000},
        ],
        "constraints": [
            # Hard: total must equal income
            {"expression": "housing + dining + savings + transport + entertainment <= 5000",
             "constraint_type": "hard", "description": "Total budget cannot exceed $5000"},
            # Hard: rent is fixed
            {"expression": "housing == 1500",
             "constraint_type": "hard", "description": "Rent is $1500/month"},
            # Soft priority 0 (highest): save at least $1000
            {"expression": "savings >= 1000",
             "constraint_type": "soft", "priority": 0, "description": "Save at least $1000"},
            # Soft priority 1: keep dining under $500
            {"expression": "dining <= 500",
             "constraint_type": "soft", "priority": 1, "description": "Dining under $500"},
            # Soft priority 2: entertainment under $300
            {"expression": "entertainment <= 300",
             "constraint_type": "soft", "priority": 2, "description": "Entertainment under $300"},
        ],
        "objective": {
            "expression": "savings",
            "direction": "maximize",
        },
    }

    print("--- 1. LLM JSON Payload ---")
    import json
    print(json.dumps(llm_output_example, indent=2))

    print("\n--- 2. Running Solver ---")
    result = solve_from_json(llm_output_example)

    print("\n--- 3. Result ---")
    print(f"Status:     {result.status}")
    print(f"Objective:  {result.objective_value}")
    print(f"Solution:   {result.solution}")
    print(f"Satisfied:  {result.satisfied_constraints}")
    print(f"Dropped:    {result.dropped_constraints}")

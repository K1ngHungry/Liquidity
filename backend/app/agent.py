"""
LLM Agent that translates natural-language budget descriptions
into structured constraint JSON for the OR-Tools solver.

Uses Dedalus Labs SDK (wrapping Anthropic Claude) with tool use
in a hybrid interaction model: single-shot by default, asks follow-ups
if ambiguous.
"""

import json
import logging
from contextvars import ContextVar
from typing import Any

from dedalus_labs import AsyncDedalus, DedalusRunner

from app.solver import solve_from_json

logger = logging.getLogger(__name__)

# --- System prompt ---

SYSTEM_PROMPT = """\
You are a budget constraint assistant. Your job is to translate the user's \
natural-language budget description into a structured constraint problem that \
can be solved by an integer linear programming solver.

## How to think about the problem

Each spending category the user mentions becomes a **variable** (integer, in whole dollars).
User requirements become **constraints**:
- **Hard constraints** MUST be satisfied (e.g., "rent is exactly $1500", "total cannot exceed income").
- **Soft constraints** are preferences that the solver will TRY to satisfy, ranked by priority \
(lower number = higher priority). If the problem is infeasible, the solver drops the \
lowest-priority soft constraints first.

If the user wants to optimize something (e.g., "maximize savings"), set that as the **objective**.

## Rules for expressions

- Use only: +, -, *, <=, >=, ==
- Variable names must be valid Python identifiers (lowercase, underscores, no spaces).
  Examples: dining_out, groceries, car_payment
- All values are integers (whole dollars).
- Do NOT use division, modulo, or exponents.
- For percentage-based rules, convert to absolute values. E.g., "save 20% of $5000 income" \
becomes "savings >= 1000".

## Interaction style

- If the user's message contains enough information (income, categories, constraints), \
call the create_constraint_problem tool immediately.
- If the message is ambiguous or missing critical info (like total income), ask a short \
clarifying question. Keep follow-ups concise — at most 1-2 questions.
- Always include a hard constraint that the sum of all category variables does not exceed \
the total income/budget.
- When the user mentions a fixed expense (rent, car payment), make it a hard equality constraint.
- When the user says "ideally", "try to", "prefer", "if possible" — make it a soft constraint.
- When the user gives a firm limit with no hedging — make it a hard constraint.

## Priority guidelines for soft constraints

Assign priorities based on how important the constraint seems to the user:
- Priority 0 (highest): savings goals, debt payments
- Priority 1: essential category limits (groceries, transport)
- Priority 2: discretionary limits (dining, entertainment, shopping)
- Priority 3 (lowest): nice-to-haves
"""


# --- Tool function (Dedalus auto-extracts the schema from type hints + docstring) ---

# Per-request holder so BudgetAgent can detect whether the solver was invoked.
# ContextVar ensures each async request gets isolated state.
_ctx_last_solver_result: ContextVar[dict | None] = ContextVar(
    "_ctx_last_solver_result", default=None
)


def create_constraint_problem(problem_json: str) -> str:
    """Create and solve a budget constraint optimization problem.

    Call this tool once you have enough information to formulate the
    user's budget as variables, constraints, and an objective.

    Args:
        problem_json: A JSON string containing the full problem specification.
            It must have the following structure:
            {
                "variables": [
                    {"name": "category_name", "lower_bound": 0, "upper_bound": 5000}
                ],
                "constraints": [
                    {
                        "expression": "category_a + category_b <= 5000",
                        "constraint_type": "hard" or "soft",
                        "priority": 0,
                        "description": "Human-readable label"
                    }
                ],
                "objective": {
                    "expression": "savings",
                    "direction": "maximize" or "minimize"
                }
            }

            - variables: each has name (valid Python identifier), lower_bound, upper_bound.
            - constraints: each has expression (math string with +, -, *, <=, >=, ==),
              constraint_type ("hard" = must hold, "soft" = preference),
              priority (lower = more important, only for soft), description.
            - objective: optional, expression to optimize and direction.

    Returns:
        A JSON string with the solver results including status, solution,
        satisfied_constraints, and dropped_constraints.
    """
    tool_input = json.loads(problem_json)

    # Log a redacted summary — never emit full budget values at INFO level.
    summary = {
        "variables_count": len(tool_input.get("variables", [])),
        "variable_names": [v.get("name") for v in tool_input.get("variables", [])],
        "constraints_count": len(tool_input.get("constraints", [])),
        "has_objective": tool_input.get("objective") is not None,
    }
    logger.info("Agent constraint problem summary: %s", summary)
    logger.debug("Full constraint JSON: %s", json.dumps(tool_input, indent=2))

    solver_result = solve_from_json(tool_input)
    result_dict = solver_result.model_dump()
    _ctx_last_solver_result.set(result_dict)

    return json.dumps(result_dict)


class BudgetAgent:
    """Hybrid LLM agent: translates budget descriptions into solver JSON."""

    def __init__(self, model: str = "anthropic/claude-sonnet-4-5-20250929"):
        self.client = AsyncDedalus()
        self.runner = DedalusRunner(self.client)
        self.model = model

    @staticmethod
    def _sanitize_conversation(raw: list) -> list[dict[str, Any]]:
        """Force conversation into plain JSON-safe dicts.

        to_input_list() may return Pydantic models or other SDK objects
        that don't survive a JSON round-trip through the frontend.
        """
        return json.loads(json.dumps(raw, default=str))

    async def run(
        self,
        user_message: str,
        conversation_history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """
        Process a user message through the agent.

        Returns:
            {
                "type": "question" | "solution",
                "content": str,              # text to display to user
                "solver_result": dict | None, # raw solver output if type=="solution"
                "conversation": list,         # updated conversation history
            }
        """
        _ctx_last_solver_result.set(None)

        messages = list(conversation_history or [])

        # Ensure system prompt is the first message
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

        messages.append({"role": "user", "content": user_message})

        logger.info("Sending %d messages to Dedalus runner", len(messages))

        # The DedalusRunner handles the full tool-calling loop automatically:
        # it calls the model, executes any tool the model invokes, feeds the
        # result back, and repeats until the model produces a final text response.
        result = await self.runner.run(
            messages=messages,
            model=self.model,
            tools=[create_constraint_problem],
        )

        updated_conversation = self._sanitize_conversation(result.to_input_list())

        solver_result = _ctx_last_solver_result.get()

        if solver_result is not None:
            return {
                "type": "solution",
                "content": result.final_output,
                "solver_result": solver_result,
                "conversation": updated_conversation,
            }

        return {
            "type": "question",
            "content": result.final_output,
            "solver_result": None,
            "conversation": updated_conversation,
        }

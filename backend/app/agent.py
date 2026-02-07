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

## Response format when a solution is found

After calling the solver tool, read the solver's JSON result carefully. Your text MUST \
match the solver output exactly — do NOT compute your own numbers.

1. **Summary** (1-2 sentences): Describe the outcome using ONLY the values from the \
solver result JSON (status, solution amounts, dropped constraints). Never do your own \
arithmetic — the solver is the source of truth.
2. **If the solver dropped any constraints**, explicitly name each dropped constraint \
and explain what it means for the user. Then add a "Ways to Adjust" section with exactly \
3 specific, creative suggestions for how the user can modify their situation to meet \
their original goals.

Keep the tone concise, friendly, and actionable. Do NOT repeat the full allocation \
table or budget health metrics — the UI renders those automatically from solver data.

## Recognizing purchase goals and spending limits

**CRITICAL**: When the user mentions wanting to buy something, save for something, or set a spending limit, you MUST call the add_user_constraint tool IMMEDIATELY. Do NOT just acknowledge it in text - actually call the tool.

Examples that REQUIRE calling add_user_constraint:
- "I want to buy a $2000 watch" → MUST call add_user_constraint with category="watch", amount=2000, operator=">=", constraint_type="hard", description="Purchase $2000 watch"
- "I'd like to save $500 for a trip" → MUST call add_user_constraint with category="trip_savings", amount=500, operator=">=", constraint_type="soft", priority=1, description="Save for trip"
- "Try to keep dining under $300" → MUST call add_user_constraint with category="dining", amount=300, operator="<=", constraint_type="soft", priority=2, description="Limit dining to $300"

Call add_user_constraint FIRST, THEN ask follow-up questions about their budget. The constraint will appear in the UI.
"""


# --- Tool function (Dedalus auto-extracts the schema from type hints + docstring) ---

# Per-request holder so BudgetAgent can detect whether the solver was invoked.
# ContextVar ensures each async request gets isolated state.
_ctx_last_solver_result: ContextVar[dict | None] = ContextVar(
    "_ctx_last_solver_result", default=None
)
_ctx_new_constraints: ContextVar[list[dict] | None] = ContextVar(
    "_ctx_new_constraints", default=None
)


def add_user_constraint(constraint_json: str) -> str:
    """Add a budget constraint based on user's purchase or spending goal.

    Call this when the user mentions wanting to buy something or sets a spending goal.
    Examples:
    - "I want to buy a $2000 watch" -> add constraint for watch >= 2000
    - "I need to save $500 for a trip" -> add constraint for trip >= 500
    - "I want to limit dining to $300" -> add constraint for dining <= 300

    Args:
        constraint_json: A JSON string with the constraint details:
            {
                "category": "watch",  # lowercase, underscores for spaces
                "operator": ">=",     # "<=", ">=", or "=="
                "amount": 2000,       # dollar amount
                "constraint_type": "hard",  # "hard" or "soft"
                "priority": 1,        # 0-4, only for soft constraints
                "description": "Purchase $2000 watch"  # human-readable
            }

    Returns:
        Confirmation message.
    """
    import uuid
    try:
        constraint = json.loads(constraint_json)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("Agent failed to parse constraint JSON: %s. Error: %s", constraint_json, e)
        return json.dumps({"status": "error", "message": "malformed constraint JSON", "details": str(e)})

    # Add unique ID and source
    constraint["id"] = f"ai-{uuid.uuid4().hex[:8]}"
    constraint["source"] = "ai"
    
    # Get current constraints and append
    current = _ctx_new_constraints.get()
    if current is None:
        current = []
    current.append(constraint)
    _ctx_new_constraints.set(current)
    
    logger.info("Agent added constraint: %s", constraint)
    return json.dumps({"status": "added", "constraint": constraint})


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


# --- Category classification for recommendations ---

_HOUSING_KEYWORDS = {"mortgage", "rent", "housing"}
_NEEDS_KEYWORDS = (
    _HOUSING_KEYWORDS
    | {"groceries", "utilities", "transportation", "insurance", "healthcare",
       "car_payment", "bills", "childcare", "phone", "internet", "water",
       "electric", "gas"}
)
_SAVINGS_KEYWORDS = {"savings", "emergency_fund", "investments", "retirement",
                     "debt_payment"}


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

        # Reset context variables for this request
        _ctx_last_solver_result.set(None)
        _ctx_new_constraints.set(None)

        # Ensure system prompt is the first message
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

        messages.append({"role": "user", "content": user_message})

        logger.info("Sending %d messages to Dedalus runner", len(messages))
        logger.info("Available tools: %s", [create_constraint_problem.__name__, add_user_constraint.__name__])

        # The DedalusRunner handles the full tool-calling loop automatically:
        # it calls the model, executes any tool the model invokes, feeds the
        # result back, and repeats until the model produces a final text response.
        result = await self.runner.run(
            messages=messages,
            model=self.model,
            tools=[create_constraint_problem, add_user_constraint],
        )

        logger.info("New constraints after run: %s", _ctx_new_constraints.get())
        updated_conversation = self._sanitize_conversation(result.to_input_list())

        # Try ContextVar first; fall back to extracting from conversation history
        # (ContextVar may not propagate if the runner executes tools in a
        # different async context or thread.)
        solver_result = _ctx_last_solver_result.get()
        if solver_result is None:
            solver_result = self._extract_solver_result(updated_conversation)

        solver_input = self._extract_solver_input(updated_conversation)
        new_constraints = self._extract_new_constraints(updated_conversation)
        
        logger.info("Extracted new_constraints from conversation: %s", new_constraints)

        if solver_result is not None:
            return {
                "type": "solution",
                "content": result.final_output,
                "solver_result": solver_result,
                "solver_input": solver_input,
                "recommendations": self._compute_recommendations(solver_result),
                "new_constraints": new_constraints,
                "conversation": updated_conversation,
            }

        return {
            "type": "question",
            "content": result.final_output,
            "solver_result": None,
            "solver_input": None,
            "recommendations": [],
            "new_constraints": new_constraints,
            "conversation": updated_conversation,
        }

    @staticmethod
    def _extract_solver_result(
        conversation: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Extract the last solver result from tool responses in the conversation."""
        for msg in reversed(conversation):
            if msg.get("role") == "tool":
                try:
                    content = msg.get("content")
                    if isinstance(content, dict):
                        data = content
                    else:
                        data = json.loads(content)
                    if "solution" in data and "status" in data:
                        return data
                except (json.JSONDecodeError, KeyError):
                    continue
        return None

    @staticmethod
    def _extract_solver_input(
        conversation: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Extract the constraint problem JSON that was passed to the solver."""
        for msg in reversed(conversation):
            tool_calls = msg.get("tool_calls")
            if not tool_calls:
                continue
            for tc in tool_calls:
                fn = tc.get("function", {})
                if fn.get("name") == "create_constraint_problem":
                    try:
                        args = json.loads(fn.get("arguments", "{}"))
                        problem_json = args.get("problem_json", "")
                        return json.loads(problem_json)
                    except (json.JSONDecodeError, TypeError):
                        continue
        return None

    @staticmethod
    def _extract_new_constraints(
        conversation: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Extract constraints added via add_user_constraint from tool responses."""
        constraints = []
        for msg in conversation:
            if msg.get("role") == "tool":
                try:
                    content = msg.get("content")
                    if isinstance(content, dict):
                        data = content
                    else:
                        data = json.loads(content)
                    if data.get("status") == "added" and "constraint" in data:
                        constraints.append(data["constraint"])
                except (json.JSONDecodeError, KeyError, TypeError):
                    continue
        return constraints

    @staticmethod
    def _compute_recommendations(
        solver_result: dict[str, Any],
    ) -> list[dict[str, str]]:
        """Compute math-backed budget health recommendations from solver output."""
        solution = solver_result.get("solution", {})
        total = sum(solution.values())
        if total == 0:
            return []

        recs: list[dict[str, str]] = []

        # Classify variables
        housing_total = sum(v for k, v in solution.items() if k in _HOUSING_KEYWORDS)
        needs_total = sum(v for k, v in solution.items() if k in _NEEDS_KEYWORDS)
        savings_total = sum(v for k, v in solution.items() if k in _SAVINGS_KEYWORDS)
        wants_total = total - needs_total - savings_total

        # 1. Housing ratio (< 30% = good, 30-40% = warning, > 40% = critical)
        if housing_total > 0:
            housing_pct = housing_total / total * 100
            if housing_pct <= 30:
                status = "good"
            elif housing_pct <= 40:
                status = "warning"
            else:
                status = "critical"
            recs.append({
                "label": "Housing Ratio",
                "value": f"{housing_pct:.1f}%",
                "threshold": "< 30%",
                "status": status,
                "detail": (
                    f"Housing is {housing_pct:.1f}% of your budget"
                    f" (${housing_total:,} of ${total:,})."
                ),
            })

        # 2. Savings rate (>= 20% = good, 10-20% = warning, < 10% = critical)
        savings_pct = savings_total / total * 100
        if savings_pct >= 20:
            status = "good"
        elif savings_pct >= 10:
            status = "warning"
        else:
            status = "critical"
        recs.append({
            "label": "Savings Rate",
            "value": f"{savings_pct:.1f}%",
            "threshold": "\u2265 20%",
            "status": status,
            "detail": (
                f"You're saving ${savings_total:,}/mo"
                f" ({savings_pct:.1f}% of budget)."
            ),
        })

        # 3. 50/30/20 split
        needs_pct = needs_total / total * 100
        wants_pct = wants_total / total * 100 if wants_total > 0 else 0.0
        # Check deviation from ideal split
        needs_ok = needs_pct <= 55  # some tolerance
        wants_ok = wants_pct <= 35
        savings_ok = savings_pct >= 18
        if needs_ok and wants_ok and savings_ok:
            status = "good"
        elif not savings_ok or needs_pct > 65:
            status = "critical"
        else:
            status = "warning"
        recs.append({
            "label": "50/30/20 Split",
            "value": f"{needs_pct:.0f}/{wants_pct:.0f}/{savings_pct:.0f}",
            "threshold": "50/30/20",
            "status": status,
            "detail": (
                f"Needs {needs_pct:.0f}% / Wants {wants_pct:.0f}%"
                f" / Savings {savings_pct:.0f}%."
            ),
        })

        # 4. Emergency fund timeline (months to save 3× needs)
        if savings_total > 0 and needs_total > 0:
            target = needs_total * 3
            months = target / savings_total
            if months <= 6:
                status = "good"
            elif months <= 12:
                status = "warning"
            else:
                status = "critical"
            recs.append({
                "label": "Emergency Fund",
                "value": f"{months:.1f} mo",
                "threshold": "\u2264 6 mo",
                "status": status,
                "detail": (
                    f"At ${savings_total:,}/mo you'll reach a 3-month"
                    f" emergency fund (${target:,}) in {months:.1f} months."
                ),
            })

        return recs

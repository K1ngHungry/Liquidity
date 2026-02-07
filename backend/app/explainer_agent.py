"""
Agent responsible for explaining solver results to the user.
It translates mathematical optimization outputs into natural language advice,
handling both feasible and infeasible scenarios.
"""
import json
import logging
from typing import Any, Dict, List

from dedalus_labs import AsyncDedalus, DedalusRunner

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a friendly financial advisor explaining a budget optimization result.
Your goal is to be clear, encouraging, and easy to read.

## Output Format (Markdown)

Use these sections:

### 1. The Verdict
- Start with a clear header.
- Use **bold** for the result (e.g., "**Plan Feasible**" or "**Adjustment Needed**").
- One sentence summary.

### 2. The Details
- Use bullet points.
- Highlight key numbers in **bold**.
- Mention the most important trade-offs or achievements.
- Do NOT list every single number.

### 3. Recommendations (Only if needed)
- If the plan failed, give 2-3 specific, actionable "What If" scenarios.
- Keep them realistic.

## Style Rules
- Use headers (###) and bullet lists (-).
- Keep paragraphs short (1-2 sentences).
- Tone: Helpful, human, non-robotic.
"""

class ExplainerAgent:
    def __init__(self, model: str = "anthropic/claude-sonnet-4-5-20250929"):
        self.client = AsyncDedalus()
        self.runner = DedalusRunner(self.client)
        self.model = model

    async def run(
        self,
        solver_result: Dict[str, Any],
        user_constraints: List[Any],
        original_query: str = ""
    ) -> str:
        """
        Generate an explanation for the solver result.
        """
        # Format the input for the LLM
        status = solver_result.get("status", "UNKNOWN")
        solution = solver_result.get("solution", {})
        dropped = solver_result.get("dropped_constraints", [])
        
        # Serialize constraints safely
        safe_constraints = []
        for c in user_constraints:
            if hasattr(c, "model_dump"):
                safe_constraints.append(c.model_dump())
            elif hasattr(c, "dict"):
                safe_constraints.append(c.dict())
            else:
                safe_constraints.append(c)

        # Simplify solution for prompt (top 5 categories by value + objective)
        top_allocations = sorted(
            [(k, v) for k, v in solution.items() if v > 0],
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        context_str = f"""
        CONTEXT:
        - User Query: "{original_query}"
        - Solver Status: {status}
        - Dropped Constraints (Failed): {json.dumps(dropped, default=str)}
        - Top Allocations: {top_allocations}
        - All User Constraints: {json.dumps(safe_constraints, default=str)}
        """

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Explain this result to the user:\n{context_str}"}
        ]

        logger.info("ExplainerAgent generating response for status: %s", status)
        
        # We don't need tools for explanation, just text generation
        result = await self.runner.run(
            messages=messages,
            model=self.model,
            tools=[] 
        )

        return result.final_output

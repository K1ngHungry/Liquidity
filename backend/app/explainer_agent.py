"""
Agent responsible for explaining solver results to the user.
It translates mathematical optimization outputs into natural language advice,
handling both feasible and infeasible scenarios.
"""
import json
import logging
import asyncio
from typing import Any, Dict, List

from dedalus_labs import AsyncDedalus, DedalusRunner

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a friendly financial advisor explaining a budget optimization result.
Your goal is to be clear, encouraging, and easy to read.

## Output Format (Plain Text with Simple Formatting)

Important: The text will be displayed in a plain text chat bubble. DO NOT use markdown headers (### or ##).

Structure your response like this:

THE VERDICT:
Start with a clear label. State if the plan is feasible or needs adjustment in ONE sentence.

KEY DETAILS:
• Use bullet points with simple hyphens or bullet symbols
• Highlight key numbers by putting them first: "$X for category"
• Mention 2-3 most important insights only
• Keep each bullet to one line if possible

RECOMMENDATIONS: (Only if the plan failed or needs changes)
• Give 2-3 specific, actionable suggestions
• Make them realistic and concrete
• Start each with an action word

## Style Rules
- NO markdown headers (###)
- NO emojis
- Use simple bullet points (• or -)
- Keep paragraphs to 1-2 sentences max
- Tone: Helpful, encouraging, conversational
- DO NOT use bold (**text**) or other markdown formatting
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
        try:
            result = await asyncio.wait_for(
                self.runner.run(
                    messages=messages,
                    model=self.model,
                    tools=[] 
                ),
                timeout=45.0
            )
            return result.final_output
        except asyncio.TimeoutError:
            logger.error("ExplainerAgent timed out")
            return "Analysis timed out. Please try again."
        except Exception as e:
            logger.exception("ExplainerAgent failed")
            return "An error occurred while generating the explanation."

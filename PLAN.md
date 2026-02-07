# LLM Constraint Agent - Implementation Plan

## Overview

Build an LLM agent (Anthropic Claude) that translates natural-language budget descriptions into a structured JSON intermediate representation (IR), which is then fed into the existing OR-Tools CP-SAT solver. The agent uses a **hybrid interaction model** (single-shot by default, follow-ups if ambiguous) and supports **hard constraints** (must hold) and **soft constraints** (priority-tiered, dropped if infeasible).

---

## Step 1: Bring in the solver from `feat/constraint-solver`

- Cherry-pick or copy `backend/app/solver.py` into the current branch
- Add `ortools` to `requirements.txt` (missing dependency)
- Add `dedalus_labs` to `requirements.txt` (replaces direct `anthropic` SDK; Dedalus wraps Anthropic Claude)

## Step 2: Extend the solver schema for soft/hard priority tiers

**File**: `backend/app/solver.py`

Extend `SolverRequest` to distinguish constraint types:

```python
class ConstraintDefinition(BaseModel):
    expression: str              # e.g. "dining <= 500"
    constraint_type: str         # "hard" | "soft"
    priority: int = 0            # lower = higher priority (only for soft)
    description: str = ""        # human-readable label
```

Update `SolverRequest.constraints` from `List[str]` to `List[ConstraintDefinition]`.

**Solving strategy for priority tiers:**
1. Add all hard constraints to the model (non-negotiable)
2. Add soft constraints sorted by priority (lowest number = highest priority)
3. If the model is infeasible, iteratively drop the lowest-priority soft constraint and re-solve
4. Return the solution along with which soft constraints were satisfied vs dropped

## Step 3: Build the LLM agent

**New file**: `backend/app/agent.py`

Core components:

### 3a. Dedalus Labs SDK setup
- Initialize the `AsyncDedalus` client and `DedalusRunner`
- Use Claude via Dedalus with tool use (function calling)

### 3b. System prompt
- Instruct Claude to act as a budget constraint translator
- Define the JSON IR schema it must output
- Explain soft vs hard constraints and priority tiers
- Provide examples of natural-language → JSON translations

### 3c. Tool definitions
Define a single tool `create_constraint_problem` that the LLM calls with:
```json
{
  "variables": [...],
  "constraints": [...],  // with hard/soft and priority
  "objective": {...}
}
```

### 3d. Hybrid interaction flow
```text
User input → LLM
  ├─ If clear enough → LLM calls create_constraint_problem tool → solve → return results
  └─ If ambiguous → LLM asks clarifying question → user responds → loop back
```

The agent function will:
1. Accept user message + conversation history
2. Send to Claude with the system prompt and tool definitions
3. If Claude responds with text → return it as a follow-up question
4. If Claude calls the tool → validate the JSON, run the solver, return results

## Step 4: Create API endpoints

**File**: `backend/app/main.py`

New endpoints:

- `POST /api/agent/solve` — Send a message to the agent
  - Request: `{ "message": str, "conversation_history": list }`
  - Response: `{ "type": "question" | "solution", "content": str | SolverResponse, "constraints_used": {...} }`

## Step 5: Frontend chat interface

**File**: `frontend/app/page.tsx` (or a new page)

- Add a simple chat interface where users describe their budget
- Display agent responses (follow-up questions or solutions)
- Show which constraints were applied (hard vs soft) and the solution
- Maintain conversation history in React state for multi-turn

---

## File Changes Summary

| File | Action |
|------|--------|
| `backend/app/solver.py` | Copy from branch + extend with priority tiers |
| `backend/app/agent.py` | **New** — LLM agent logic |
| `backend/app/main.py` | Add agent endpoint |
| `backend/requirements.txt` | Add `ortools`, `dedalus_labs` |
| `frontend/lib/api.ts` | Add agent API methods |
| `frontend/app/page.tsx` | Add chat UI for the agent |

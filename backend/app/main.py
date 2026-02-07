from typing import Any
import os

from dotenv import load_dotenv
load_dotenv()

import logging

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agent import BudgetAgent
from app.nessie_client import get_nessie_client, NessieClient, transform_nessie_to_constraints
from app.supabase_client import get_supabase_client, require_auth_user_id
from app.models import (
    CreateUserRequest, 
 
    OptimizationResponse,
    LinkNessieResponse,
    NessieMappingResponse,
    AgentRequest,
    AgentResponse
)
from app.solver import solve_from_json

logger = logging.getLogger(__name__)

app = FastAPI(title="Liquidity API", version="1.0.0")

budget_agent = BudgetAgent()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize Nessie client on startup."""
    from app import nessie_client as nc_module
    api_key = os.getenv("NESSIE_API_KEY")
    if not api_key:
        raise ValueError("NESSIE_API_KEY environment variable not set")
    nc_module.nessie_client = NessieClient(api_key=api_key)
    logger.info("Nessie client initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Close Nessie client on shutdown."""
    try:
        client = get_nessie_client()
        await client.close()
        logger.info("Nessie client closed")
    except Exception as e:
        logger.error(f"Error closing Nessie client: {e}")


class HealthResponse(BaseModel):
    status: str
    message: str


class ItemRequest(BaseModel):
    name: str
    value: float


class ItemResponse(BaseModel):
    name: str
    value: float
    processed: bool


async def _run_nessie_optimization(nessie_customer_id: str) -> OptimizationResponse:
    """Fetch Nessie data, build constraints, and run the solver."""
    nessie = get_nessie_client()
    accounts = await nessie.get_customer_accounts(nessie_customer_id)

    bills = []
    if accounts:
        first_account_id = accounts[0]["_id"]
        bills = await nessie.get_account_bills(first_account_id)

    constraint_json = transform_nessie_to_constraints(accounts, bills)
    solver_result = solve_from_json(constraint_json)

    return OptimizationResponse(
        solver_result=solver_result.model_dump(),
        nessie_data_summary={
            "total_accounts": len(accounts),
            "total_balance": sum(acc.get("balance", 0) for acc in accounts),
            "total_bills": len(bills),
            "total_bill_amount": sum(bill.get("payment_amount", 0) for bill in bills),
        },
        constraints_generated=constraint_json["constraints"],
    )


# Nessie API endpoints

@app.post("/api/nessie/link", response_model=LinkNessieResponse)
async def link_nessie_customer(
    req: CreateUserRequest,
    auth_user_id: str = Depends(require_auth_user_id),
):
    """
    Create a Nessie customer and store mapping in Supabase.

    Requires a valid Supabase auth token in Authorization header.
    """
    try:
        nessie = get_nessie_client()
        nessie_customer = await nessie.create_customer(
            first_name=req.first_name,
            last_name=req.last_name,
            address=req.address,
        )
        customer_id = nessie_customer["objectCreated"]["_id"]

        supabase = get_supabase_client()
        response = (
            supabase.table("nessie_customers")
            .upsert(
                {
                    "auth_user_id": auth_user_id,
                    "nessie_customer_id": customer_id,
                },
                on_conflict="auth_user_id",
            )
            .execute()
        )

        row = response.data[0] if response.data else {}

        return LinkNessieResponse(
            auth_user_id=auth_user_id,
            nessie_customer_id=customer_id,
            created_at=row.get("created_at", ""),
        )
    except Exception as e:
        logger.error(f"Failed to link Nessie customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/nessie/me", response_model=NessieMappingResponse)
async def get_nessie_mapping(auth_user_id: str = Depends(require_auth_user_id)):
    """Return the Nessie customer mapping for the authenticated user."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("nessie_customers")
            .select("auth_user_id, nessie_customer_id, created_at")
            .eq("auth_user_id", auth_user_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Nessie customer not linked")

        row = response.data[0]
        return NessieMappingResponse(**row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch Nessie mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/nessie/optimize", response_model=OptimizationResponse)
async def optimize_current_user_liquidity(
    auth_user_id: str = Depends(require_auth_user_id),
):
    """Optimize liquidity for the authenticated Supabase user."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("nessie_customers")
            .select("nessie_customer_id")
            .eq("auth_user_id", auth_user_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Nessie customer not linked")

        nessie_customer_id = response.data[0]["nessie_customer_id"]
        return await _run_nessie_optimization(nessie_customer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to optimize for auth user {auth_user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Liquidity API (Supabase Integration)"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="API is running successfully"
    )


@app.get("/api/hello")
async def hello():
    """Sample hello endpoint"""
    return {"message": "Hello from FastAPI!"}


@app.post("/api/process", response_model=ItemResponse)
async def process_item(item: ItemRequest):
    """Process an item - example endpoint"""
    return ItemResponse(
        name=item.name,
        value=item.value * 2,  # Example processing
        processed=True
    )


@app.get("/api/items")
async def get_items():
    """Get a list of items - example endpoint"""
    return {
        "items": [
            {"id": 1, "name": "Item 1", "value": 100},
            {"id": 2, "name": "Item 2", "value": 200},
            {"id": 3, "name": "Item 3", "value": 300},
        ]
    }


@app.post("/api/agent/solve", response_model=AgentResponse)
async def agent_solve(req: AgentRequest):
    """Send a budget description to the LLM agent.

    The agent either returns a follow-up question or a solved budget allocation.
    Pass the returned `conversation` back in subsequent requests to continue
    the dialogue.
    """
    try:
        result = await budget_agent.run(
            user_message=req.message,
            conversation_history=req.conversation_history or None,
        )
        return AgentResponse(**result)
    except Exception as e:
        logger.exception("agent_solve failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

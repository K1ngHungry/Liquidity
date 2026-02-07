from typing import Any
from datetime import datetime
import calendar
import os

from dotenv import load_dotenv
load_dotenv()

import logging

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


from app.agent import BudgetAgent
from app.explainer_agent import ExplainerAgent
from app.nessie_client import get_nessie_client, NessieClient, transform_nessie_to_constraints
from app.supabase_client import get_supabase_client, require_auth_user_id
from app.models import (
    CreateUserRequest,

    OptimizationResponse,
    LinkNessieResponse,
    NessieMappingResponse,
    AgentRequest,
    AgentResponse,
    DirectSolveRequest,
    DashboardResponse,
    DashboardSummary,
    DashboardTransaction,
    DashboardBudget,
    DashboardMonthlySpending,
    DashboardCategoryBreakdown,
    DashboardAccount,
    DashboardDemoFlags,
    ExplainRequest,
    ExplainResponse,
)
from app.solver import solve_from_json

logger = logging.getLogger(__name__)

app = FastAPI(title="Liquidity API", version="1.0.0")

budget_agent = BudgetAgent()
explainer_agent = ExplainerAgent()

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


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _last_six_month_labels(now: datetime) -> list[tuple[int, int, str]]:
    labels: list[tuple[int, int, str]] = []
    year = now.year
    month = now.month
    for _ in range(6):
        label = calendar.month_abbr[month]
        labels.append((year, month, label))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    labels.reverse()
    return labels


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


def _build_dashboard_response(
    accounts: list[dict[str, Any]],
    purchases: list[dict[str, Any]],
    bills: list[dict[str, Any]],
    deposits: list[dict[str, Any]],
) -> DashboardResponse:
    total_balance = sum(_safe_float(acc.get("balance")) for acc in accounts)

    transactions: list[DashboardTransaction] = []
    category_totals: dict[str, float] = {}
    purchase_total = 0.0

    for purchase in purchases:
        if purchase.get("status") == "cancelled":
            continue
        amount = _safe_float(purchase.get("amount"))
        purchase_total += amount
        description = purchase.get("description") or "Purchase"
        merchant = str(purchase.get("merchant_id") or purchase.get("merchant") or description)
        category = purchase.get("category") or description
        category_totals[category] = category_totals.get(category, 0.0) + amount

        purchase_date = purchase.get("purchase_date") or purchase.get("created_at") or purchase.get("date")
        date_str = purchase_date if isinstance(purchase_date, str) else ""

        transactions.append(
            DashboardTransaction(
                id=str(purchase.get("_id") or purchase.get("id") or ""),
                date=date_str,
                description=description,
                amount=-abs(amount),
                category=category,
                merchant=merchant,
                type="debit",
                status=str(purchase.get("status") or "posted"),
            )
        )

    total_bills = sum(_safe_float(bill.get("payment_amount")) for bill in bills)

    now = datetime.utcnow()
    month_labels = _last_six_month_labels(now)
    monthly_spending_map = {(y, m): total_bills for (y, m, _) in month_labels}

    for purchase in purchases:
        if purchase.get("status") == "cancelled":
            continue
        parsed = _parse_date(purchase.get("purchase_date") or purchase.get("created_at") or purchase.get("date"))
        if not parsed:
            continue
        key = (parsed.year, parsed.month)
        if key in monthly_spending_map:
            monthly_spending_map[key] += _safe_float(purchase.get("amount"))

    monthly_income_map = {(y, m): 0.0 for (y, m, _) in month_labels}
    for deposit in deposits:
        parsed = _parse_date(deposit.get("transaction_date") or deposit.get("created_at") or deposit.get("date"))
        if not parsed:
            continue
        key = (parsed.year, parsed.month)
        if key in monthly_income_map:
            monthly_income_map[key] += _safe_float(deposit.get("amount"))

    monthly_spending: list[DashboardMonthlySpending] = []
    for year, month, label in month_labels:
        monthly_spending.append(
            DashboardMonthlySpending(
                month=label,
                amount=monthly_spending_map.get((year, month), total_bills),
            )
        )

    category_breakdown: list[DashboardCategoryBreakdown] = []
    color_palette = ["#9FC490", "#82A3A1", "#C0DFA1", "#465362", "#6A8A88", "#B0D49A", "#5B7B79", "#3A4857"]
    if purchase_total > 0:
        for idx, (category, amount) in enumerate(
            sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        ):
            percentage = (amount / purchase_total) * 100
            category_breakdown.append(
                DashboardCategoryBreakdown(
                    category=category,
                    amount=amount,
                    percentage=round(percentage, 1),
                    color=color_palette[idx % len(color_palette)],
                )
            )

    current_month_key = (now.year, now.month)
    current_month_spending = monthly_spending_map.get(current_month_key, total_bills)
    prev_month_index = month_labels[-2] if len(month_labels) >= 2 else None
    prev_month_spending = monthly_spending_map.get((prev_month_index[0], prev_month_index[1]), total_bills) if prev_month_index else total_bills
    month_over_month = 0.0
    if prev_month_spending:
        month_over_month = ((current_month_spending - prev_month_spending) / prev_month_spending) * 100

    summary = DashboardSummary(
        totalBalance=total_balance,
        monthlyIncome=monthly_income_map.get(current_month_key, 0.0),
        monthlyExpenses=current_month_spending,
        savingsRate=0.0,
        monthOverMonth=round(month_over_month, 1),
    )

    demo_flags = DashboardDemoFlags(
        summary=len(accounts) == 0,
        transactions=len(transactions) == 0,
        bills=len(bills) == 0,
        deposits=len(deposits) == 0,
        monthlySpending=len(monthly_spending) == 0,
        categoryBreakdown=len(category_breakdown) == 0,
        budgets=True,
    )

    return DashboardResponse(
        summary=summary,
        accounts=[
            DashboardAccount(
                id=str(acc.get("_id") or acc.get("id") or ""),
                type=acc.get("type"),
                nickname=acc.get("nickname"),
                balance=_safe_float(acc.get("balance")),
            )
            for acc in accounts
        ],
        transactions=transactions,
        bills=bills,
        deposits=deposits,
        monthlySpending=monthly_spending,
        categoryBreakdown=category_breakdown,
        budgets=[],
        demoFlags=demo_flags,
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


@app.get("/api/nessie/dashboard", response_model=DashboardResponse)
async def get_dashboard_data(auth_user_id: str = Depends(require_auth_user_id)):
    """Fetch Nessie accounts, purchases, and bills for dashboard data."""
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

        nessie = get_nessie_client()
        accounts = await nessie.get_customer_accounts(nessie_customer_id)

        purchases: list[dict[str, Any]] = []
        bills: list[dict[str, Any]] = []
        deposits: list[dict[str, Any]] = []

        for account in accounts:
            account_id = account.get("_id") or account.get("id")
            if not account_id:
                continue
            try:
                purchases.extend(await nessie.get_account_purchases(account_id))
            except Exception as e:
                logger.warning(f"Failed to fetch purchases for account {account_id}: {e}")
            try:
                bills.extend(await nessie.get_account_bills(account_id))
            except Exception as e:
                logger.warning(f"Failed to fetch bills for account {account_id}: {e}")
            try:
                deposits.extend(await nessie.get_account_deposits(account_id))
            except Exception as e:
                logger.warning(f"Failed to fetch deposits for account {account_id}: {e}")

        return _build_dashboard_response(accounts, purchases, bills, deposits)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to build dashboard data: {e}")
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
        # Convert user constraints to plain dicts for the agent
        constraints_dicts = [c.model_dump() for c in req.user_constraints] if req.user_constraints else None

        result = await budget_agent.run(
            user_message=req.message,
            conversation_history=req.conversation_history or None,
            user_constraints=constraints_dicts,
        )
        return AgentResponse(**result)
    except Exception as e:
        logger.exception("agent_solve failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e


@app.post("/api/constraints/solve", response_model=AgentResponse)
async def direct_solve(req: DirectSolveRequest):
    """Solve directly from UI constraints without LLM involvement."""
    try:
        constraints_dicts = [c.model_dump() for c in req.constraints]
        result = BudgetAgent.solve_direct(
            user_constraints=constraints_dicts,
            objective_category=req.objective_category,
            objective_direction=req.objective_direction,
        )
        return AgentResponse(**result)
    except Exception as e:
        logger.exception("direct_solve failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e


@app.post("/api/agent/explain", response_model=ExplainResponse)
async def agent_explain(req: ExplainRequest):
    """Generate a natural language explanation for a solver result."""
    try:
        constraints_dicts = [c.model_dump() for c in req.user_constraints]
        explanation = await explainer_agent.run(
            solver_result=req.solver_result,
            user_constraints=constraints_dicts,
            original_query=req.original_query
        )
        return ExplainResponse(explanation=explanation)
    except Exception as e:
        logger.exception("agent_explain failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

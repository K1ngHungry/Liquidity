from pydantic import BaseModel
from typing import Dict, Any, List

# Request models
class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    address: Dict[str, str]

# Response models
class CreateUserResponse(BaseModel):
    user_id: int
    nessie_customer_id: str
    created_at: str


class LinkNessieResponse(BaseModel):
    auth_user_id: str
    nessie_customer_id: str
    created_at: str


class NessieMappingResponse(BaseModel):
    auth_user_id: str
    nessie_customer_id: str
    created_at: str

class OptimizationResponse(BaseModel):
    solver_result: Dict[str, Any]
    nessie_data_summary: Dict[str, Any]
    constraints_generated: List[Dict[str, Any]]

class AgentRequest(BaseModel):
    message: str
    conversation_history: list[dict[str, Any]] = []

class AgentResponse(BaseModel):
    type: str  # "question" or "solution"
    content: str
    solver_result: dict[str, Any] | None = None
    solver_input: dict[str, Any] | None = None
    recommendations: list[dict[str, str]] = []
    new_constraints: list[dict[str, Any]] = []  # Constraints to add to UI
    conversation: list[dict[str, Any]]


class DashboardSummary(BaseModel):
    totalBalance: float
    monthlyIncome: float
    monthlyExpenses: float
    savingsRate: float
    monthOverMonth: float


class DashboardTransaction(BaseModel):
    id: str
    date: str
    description: str
    amount: float
    category: str
    merchant: str
    type: str


class DashboardBudget(BaseModel):
    category: str
    limit: float
    spent: float
    color: str


class DashboardMonthlySpending(BaseModel):
    month: str
    amount: float


class DashboardCategoryBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float
    color: str


class DashboardAccount(BaseModel):
    id: str
    type: str | None = None
    nickname: str | None = None
    balance: float | None = None


class DashboardDemoFlags(BaseModel):
    summary: bool
    transactions: bool
    bills: bool
    deposits: bool
    monthlySpending: bool
    categoryBreakdown: bool
    budgets: bool


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    accounts: list[DashboardAccount]
    transactions: list[DashboardTransaction]
    bills: list[dict[str, Any]]
    deposits: list[dict[str, Any]]
    monthlySpending: list[DashboardMonthlySpending]
    categoryBreakdown: list[DashboardCategoryBreakdown]
    budgets: list[DashboardBudget]
    demoFlags: DashboardDemoFlags

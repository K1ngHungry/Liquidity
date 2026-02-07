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
    conversation: list[dict[str, Any]]

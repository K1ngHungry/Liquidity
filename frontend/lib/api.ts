const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Item {
  id: number;
  name: string;
  value: number;
}

export interface ItemRequest {
  name: string;
  value: number;
}

export interface ItemResponse {
  name: string;
  value: number;
  processed: boolean;
}

export interface HealthResponse {
  status: string;
  message: string;
}

export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface CreateUserResponse {
  user_id: number;
  nessie_customer_id: string;
  created_at: string;
}

export interface LinkNessieResponse {
  auth_user_id: string;
  nessie_customer_id: string;
  created_at: string;
}

export interface NessieMappingResponse {
  auth_user_id: string;
  nessie_customer_id: string;
  created_at: string;
}

export interface OptimizationResponse {
  solver_result: {
    status: string;
    objective_value: number;
    solution: Record<string, number>;
    satisfied_constraints: string[];
    dropped_constraints: string[];
  };
  nessie_data_summary: Record<string, unknown>;
  constraints_generated: Record<string, unknown>[];
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  monthOverMonth: number;
}

export interface DashboardTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  merchant: string;
  type: "debit" | "credit";
}

export interface DashboardBudget {
  category: string;
  limit: number;
  spent: number;
  color: string;
}

export interface DashboardMonthlySpending {
  month: string;
  amount: number;
}

export interface DashboardCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface DashboardAccount {
  id: string;
  type?: string | null;
  nickname?: string | null;
  balance?: number | null;
}

export interface DashboardDemoFlags {
  summary: boolean;
  income: boolean;
  transactions: boolean;
  bills: boolean;
  deposits: boolean;
  monthlySpending: boolean;
  categoryBreakdown: boolean;
  budgets: boolean;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  accounts: DashboardAccount[];
  transactions: DashboardTransaction[];
  bills: Record<string, unknown>[];
  deposits: Record<string, unknown>[];
  monthlySpending: DashboardMonthlySpending[];
  categoryBreakdown: DashboardCategoryBreakdown[];
  budgets: DashboardBudget[];
  demoFlags: DashboardDemoFlags;
}

// User Constraint Types (Form-Based)
export interface UserConstraint {
  id: string;
  category: string;
  operator: "<=" | ">=" | "==";
  amount: number;
  constraint_type: "hard" | "soft";
  priority: number; // 0-4
  description: string;
  source: "user" | "ai" | "nessie";
}

export interface UserPriority {
  category: string;
  priority: number; // 0-4
}

export interface AgentRequest {
  message: string;
  conversation_history: Record<string, unknown>[];
}

export interface ContextualAgentRequest extends AgentRequest {
  user_constraints?: UserConstraint[];
  category_priorities?: UserPriority[];
  nessie_context?: Record<string, unknown>;
}

export interface Recommendation {
  label: string;
  value: string;
  threshold: string;
  status: "good" | "warning" | "critical";
  detail: string;
}

export interface AgentResponse {
  type: "question" | "solution";
  content: string;
  solver_result: Record<string, unknown> | null;
  solver_input: Record<string, unknown> | null;
  recommendations: Recommendation[];
  new_constraints: Record<string, unknown>[];
  conversation: Record<string, unknown>[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.detail || response.statusText;
      throw new Error(`API Error: ${detail}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  async hello(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/hello");
  }

  async getItems(): Promise<{ items: Item[] }> {
    return this.request<{ items: Item[] }>("/api/items");
  }

  async processItem(item: ItemRequest): Promise<ItemResponse> {
    return this.request<ItemResponse>("/api/process", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  async agentSolve(req: AgentRequest): Promise<AgentResponse> {
    return this.request<AgentResponse>("/api/agent/solve", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async linkNessieCustomer(
    data: CreateUserRequest,
    accessToken: string,
  ): Promise<LinkNessieResponse> {
    return this.request<LinkNessieResponse>("/api/nessie/link", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  
  async getNessieMapping(accessToken: string): Promise<NessieMappingResponse> {
    return this.request<NessieMappingResponse>("/api/nessie/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }


  async optimizeCurrentUser(accessToken: string): Promise<OptimizationResponse> {
    return this.request<OptimizationResponse>("/api/nessie/optimize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getNessieDashboard(accessToken: string, refresh = false): Promise<DashboardResponse> {
    const query = refresh ? "?refresh=true" : "";
    return this.request<DashboardResponse>(`/api/nessie/dashboard${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}

export const apiClient = new ApiClient();

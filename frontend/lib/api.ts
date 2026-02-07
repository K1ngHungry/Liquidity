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

export interface AgentRequest {
  message: string;
  conversation_history: Record<string, unknown>[];
}

export interface AgentResponse {
  type: "question" | "solution";
  content: string;
  solver_result: Record<string, unknown> | null;
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

  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    return this.request<CreateUserResponse>("/api/nessie/users/create", {
      method: "POST",
      body: JSON.stringify(data),
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

  async optimizeUser(userId: number): Promise<OptimizationResponse> {
    return this.request<OptimizationResponse>(`/api/nessie/users/${userId}/optimize`, {
      method: "POST",
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
}

export const apiClient = new ApiClient();

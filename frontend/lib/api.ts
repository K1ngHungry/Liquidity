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
      throw new Error(`API Error: ${response.statusText}`);
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
}

export const apiClient = new ApiClient();

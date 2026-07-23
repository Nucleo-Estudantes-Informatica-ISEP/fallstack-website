import "client-only";

import { BASE_URL } from "@/config/api";

export class HttpClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface HttpClient {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  put<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  delete<T>(path: string, init?: RequestInit): Promise<T>;
  /** Escape hatch for non-JSON responses (file downloads, redirects). Still throws HttpClientError on non-2xx. */
  raw(path: string, init?: RequestInit): Promise<Response>;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const json = await response.json().catch(() => undefined);
  if (typeof json?.error === "string") return json.error;
  if (typeof json?.message === "string") return json.message;
  return response.statusText || "Request failed";
}

class FetchHttpClient implements HttpClient {
  constructor(private baseUrl: string) {}

  async raw(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok)
      throw new HttpClientError(
        await extractErrorMessage(response),
        response.status
      );
    return response;
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    init: RequestInit
  ): Promise<T> {
    const isFormData = body instanceof FormData;
    const response = await this.raw(path, {
      ...init,
      method,
      headers: isFormData
        ? init.headers
        : { "Content-Type": "application/json", ...init.headers },
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  get<T>(path: string, init: RequestInit = {}) {
    return this.request<T>("GET", path, undefined, init);
  }
  post<T>(path: string, body?: unknown, init: RequestInit = {}) {
    return this.request<T>("POST", path, body, init);
  }
  patch<T>(path: string, body?: unknown, init: RequestInit = {}) {
    return this.request<T>("PATCH", path, body, init);
  }
  put<T>(path: string, body?: unknown, init: RequestInit = {}) {
    return this.request<T>("PUT", path, body, init);
  }
  delete<T>(path: string, init: RequestInit = {}) {
    return this.request<T>("DELETE", path, undefined, init);
  }
}

export const httpClient: HttpClient = new FetchHttpClient(BASE_URL);

import { ApiError } from "../types/api";
import { clearSession, readToken } from "./auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function buildHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  const token = readToken();
  if (token) merged.set("Authorization", `Bearer ${token}`);
  if (!merged.has("Content-Type")) merged.set("Content-Type", "application/json");
  return merged;
}

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(init?.headers)
  });
  const contentType = response.headers.get("content-type") ?? "";
  let data: (T & ApiError) | null = null;
  let textBody = "";

  if (contentType.includes("application/json")) {
    try {
      data = (await response.json()) as T & ApiError;
    } catch {
      data = null;
    }
  } else {
    textBody = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearSession();
    }
    const nonJsonMessage = textBody.trim() ? `${response.status} ${response.statusText}: ${textBody.trim()}` : `${response.status} ${response.statusText}`;
    throw new Error(data?.error ?? nonJsonMessage ?? "Request failed");
  }

  if (data !== null) {
    return data;
  }

  // Successful non-JSON response is unexpected for our API calls.
  // Return an empty object to keep callers stable while preserving contract safety.
  return {} as T;
}

function request<T>(method: HttpMethod, url: string, body?: unknown, init?: RequestInit): Promise<T> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return fetchJSON<T>(url, {
    ...init,
    method,
    body: payload
  });
}

export const apiClient = {
  get<T>(url: string, init?: RequestInit) {
    return request<T>("GET", url, undefined, init);
  },
  post<T>(url: string, body?: unknown, init?: RequestInit) {
    return request<T>("POST", url, body, init);
  },
  put<T>(url: string, body?: unknown, init?: RequestInit) {
    return request<T>("PUT", url, body, init);
  },
  patch<T>(url: string, body?: unknown, init?: RequestInit) {
    return request<T>("PATCH", url, body, init);
  },
  del<T>(url: string, init?: RequestInit) {
    return request<T>("DELETE", url, undefined, init);
  }
};

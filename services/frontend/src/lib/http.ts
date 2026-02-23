import { ApiError } from "../types/api";

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
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

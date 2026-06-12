import { apiStatusMessage } from "../utils/friendlyError";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100/api";

export interface ApiOptions extends RequestInit {
  token?: string | null;
  employeeToken?: string | null;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.employeeToken) headers.set("x-employee-token", options.employeeToken);

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(apiStatusMessage(0, error instanceof Error ? error.message : undefined));
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? payload?.error?.message;
    throw new Error(apiStatusMessage(response.status, message));
  }

  const payload = await response.json();

  if (payload && typeof payload === "object" && payload.success === true && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

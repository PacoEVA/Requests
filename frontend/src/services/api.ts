const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export interface ApiOptions extends RequestInit {
  token?: string | null;
  employeeToken?: string | null;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.employeeToken) headers.set("x-employee-token", options.employeeToken);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? "No se pudo completar la operación";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

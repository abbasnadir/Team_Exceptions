import { ENV } from "./env";

export interface ApiUser {
  id: string;
  email: string;
  role: "organization" | "user";
  display_name?: string | null;
  organization_name?: string | null;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vaniflow_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) localStorage.removeItem("vaniflow_token");
  else localStorage.setItem("vaniflow_token", token);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  token?: string | null
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${ENV.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message ?? data?.message ?? "Request failed";
    throw new Error(message);
  }
  return data as T;
}

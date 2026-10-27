import type { Customer, CustomerInput, SearchParams, Alert } from "@shared/index";

const TOKEN_KEY = "crm_token";

/**
 * Base URL of the API.
 * - In local dev / single-process hosting this stays empty, so requests go to
 *   the same origin at "/api" (Vite proxies it to the local server).
 * - For split hosting (static site on DreamHost + API on Render), set
 *   VITE_API_BASE_URL at build time to the API origin, e.g.
 *   "https://res-crm-api.onrender.com". We trim any trailing slash.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, "Session expired. Please log in again.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function toQuery(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status?.length) sp.set("status", params.status.join(","));
  if (params.transactionType?.length) sp.set("transactionType", params.transactionType.join(","));
  if (params.propertyType?.length) sp.set("propertyType", params.propertyType.join(","));
  if (params.districtCode) sp.set("districtCode", params.districtCode);
  if (params.location) sp.set("location", params.location);
  if (params.budgetMin != null) sp.set("budgetMin", String(params.budgetMin));
  if (params.budgetMax != null) sp.set("budgetMax", String(params.budgetMax));
  if (params.includeArchived) sp.set("includeArchived", "true");
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  async register(email: string, password: string) {
    const r = await request<{ token: string; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(r.token);
    return r;
  },
  async login(email: string, password: string) {
    const r = await request<{ token: string; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(r.token);
    return r;
  },
  health() {
    return request<{ ok: boolean; hasUsers: boolean }>("/health");
  },
  search(params: SearchParams) {
    return request<Customer[]>(`/customers${toQuery(params)}`);
  },
  get(id: string) {
    return request<Customer>(`/customers/${id}`);
  },
  create(input: CustomerInput) {
    return request<Customer>("/customers", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: string, input: CustomerInput) {
    return request<Customer>(`/customers/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  setStatus(id: string, status: Customer["status"]) {
    return request<Customer>(`/customers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  addActivity(id: string, note: string) {
    return request<Customer>(`/customers/${id}/activities`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },
  remove(id: string) {
    return request<void>(`/customers/${id}`, { method: "DELETE" });
  },
  alerts(birthdayWindow?: number, followUpWindow?: number) {
    const sp = new URLSearchParams();
    if (birthdayWindow != null) sp.set("birthdayWindow", String(birthdayWindow));
    if (followUpWindow != null) sp.set("followUpWindow", String(followUpWindow));
    const qs = sp.toString();
    return request<Alert[]>(`/alerts${qs ? `?${qs}` : ""}`);
  },
  exportUrl(params: SearchParams): string {
    return `${API_BASE}/api/export${toQuery(params)}`;
  },
  async downloadExport(params: SearchParams) {
    const token = getToken();
    const res = await fetch(this.exportUrl(params), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

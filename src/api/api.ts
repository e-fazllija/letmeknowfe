import axios from "axios";
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

// Base URL comes from VITE_API_BASE_URL. For dev, it's typically http://localhost:3000/v1
function normalizeBaseUrl(raw?: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  // drop trailing slash
  return s.replace(/\/$/, "");
}

const BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

// Single-flight refresh control
let refreshing = false;
let refreshPromise: Promise<void> | null = null;

function isMutating(method?: string) {
  const m = (method || "").toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

// Axios instance
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL, // must already include /v1 when needed
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
api.interceptors.request.use((config) => {
  // Always send cookies
  (config as any).withCredentials = true;

  // Dev header x-tenant-id
  if (import.meta.env.DEV) {
    const tenant = (import.meta as any).env?.VITE_TENANT_ID as string | undefined;
    if (tenant && tenant.trim()) {
      config.headers = config.headers || {};
      (config.headers as any)["x-tenant-id"] = tenant.trim();
    }
  } else {
    // Ensure no tenant header leaks in prod
    if (config.headers && (config.headers as any)["x-tenant-id"]) {
      delete (config.headers as any)["x-tenant-id"];
    }
  }

  // Do NOT add X-CSRF-Token (disabled per spec)

  // Ensure we call paths relative to baseURL (which includes /v1)
  if (typeof config.url === "string" && config.url.startsWith("/")) {
    config.url = config.url.replace(/^\/+/, "");
  }

  // For refresh endpoint avoid sending explicit Content-Type
  const urlLower = String(config.url || "").toLowerCase();
  if (urlLower.endsWith("tenant/auth/refresh") && config.headers) {
    try { delete (config.headers as any)["Content-Type"]; } catch {}
  }

  return config;
});

// Response interceptor: on 401 → single-flight refresh → retry once
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error?.response?.status;
    const original = error?.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = String(original?.url || "").toLowerCase();

    if (status === 401 && original && !original._retry) {
      // Never refresh on the refresh/login/mfa routes to avoid loops
      const isAuthRoute = url.includes("tenant/auth/");
      const isRefresh = url.endsWith("tenant/auth/refresh");
      if (!isRefresh && !url.endsWith("tenant/auth/login") && !url.endsWith("tenant/auth/mfa/complete")) {
        try {
          if (!refreshing) {
            refreshing = true;
            refreshPromise = (async () => { await refresh(); })().finally(() => { refreshing = false; });
          }
          await (refreshPromise as Promise<void>);
          // Retry once
          original._retry = true;
          return api.request(original);
        } catch (e) {
          return Promise.reject(error);
        }
      }
    }
    return Promise.reject(error);
  }
);

// === Auth API ===

export type LoginResponse = {
  message?: string;
  user?: any;
  accessToken?: string; // cookie-based; ignore client-side
  mfaRequired?: boolean;
  mfaToken?: string;
  methods?: string[];
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post("tenant/auth/login", { email, password });
  return (data as any) || {};
}

export async function completeMfa(mfaToken: string, code: string): Promise<{ message?: string; user?: any; accessToken?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${mfaToken}`,
  };
  const { data } = await api.post("tenant/auth/mfa/complete", { code }, { headers });
  return (data as any) || {};
}

export async function refresh(): Promise<void> {
  await api.post("tenant/auth/refresh", undefined, {
    // remove Content-Type via request interceptor
    transformRequest: [(_data, headers) => {
      try { if (headers) delete (headers as any)["Content-Type"]; } catch {}
      return undefined as any;
    }],
    validateStatus: (s) => s >= 200 && s < 500,
  }).then((res) => {
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`refresh failed: ${res.status}`);
    }
  });
}

export async function logout(): Promise<void> {
  try { await api.post("tenant/auth/logout", {}); } catch {}
}

export async function me<T = any>(): Promise<T | null> {
  const { data } = await api.get("tenant/auth/me");
  return (data as any) ?? null;
}

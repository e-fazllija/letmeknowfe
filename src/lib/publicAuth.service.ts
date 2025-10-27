// src/lib/publicAuth.service.ts
import api, { v1 } from "@/lib/api";

/** Attiva account owner dal link ricevuto via email (selector + token + nuova password) */
export async function activateOwner(params: { selector: string; token: string; password: string }) {
  const { data } = await api.post(v1("public/auth/activate"), params);
  return data as { message: string };
}

// New name aligned to spec; keep both for compatibility
export async function activateAccount(input: { selector: string; token: string; password: string }): Promise<{ message: string }> {
  // Build absolute URL using env origin + v1 path; avoid axios interceptors to ensure no cookies and no x-tenant-id
  const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  function hostOrigin(url?: string): string {
    try {
      if (!url) return "";
      const withProto = /^https?:\/\//i.test(url) ? url : `http://${String(url).replace(/^\/+/, "")}`;
      const u = new URL(withProto);
      return `${u.protocol}//${u.host}`;
    } catch { return ""; }
  }
  const origin = hostOrigin(RAW_BASE) || "";
  const url = `${origin}${v1("public/auth/activate")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return (data as any) || { message: "OK" };
}

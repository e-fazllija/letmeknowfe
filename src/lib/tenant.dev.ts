// src/lib/tenant.dev.ts
export function getDevTenantId(): string {
  const env = (import.meta as any).env?.VITE_DEV_TENANT_ID?.trim();
  if (env) return env;
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQs = qs.get("tenant")?.trim();
    if (fromQs) return fromQs;
  } catch {}
  try {
    const ls =
      localStorage.getItem("lmw_tenant_id") ||
      localStorage.getItem("lmw_client_id") ||
      "";
    return (ls || "").trim();
  } catch {
    return "";
  }
}


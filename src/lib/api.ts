// src/lib/api.ts
import axios from "axios";

import type { Report, ReportMessage } from "./report.dto";

// --- ENV origin/prefix (cookie-first; no rewrite to window.origin) ---
const RAW_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
if (!RAW_ORIGIN && import.meta.env.PROD) {
  throw new Error("[config] VITE_API_BASE_URL is required in production builds");
}
export const ORIGIN = RAW_ORIGIN || "http://localhost:3000";
const PREFIX = (import.meta.env.VITE_API_PREFIX ?? "/v1").trim();

// Helper endpoint v1 idempotente
export function v1(p: string): string {
  if (!p) return PREFIX;
  const url = p.trim();
  // assoluti: lasciali stare
  if (/^https?:\/\//i.test(url)) return url;
  // normalizza
  const normPrefix = PREFIX.endsWith("/") ? PREFIX.slice(0, -1) : PREFIX;
  const normUrl = url.startsWith("/") ? url : `/${url}`;
  // già prefissato? ("/v1" oppure "/v1/...")
  if (normUrl === normPrefix || normUrl.startsWith(`${normPrefix}/`)) {
    return normUrl;
  }
  return `${normPrefix}${normUrl}`;
}

console.log("[API] origin =", ORIGIN, " prefix =", PREFIX);

// --- Public enums (aligned to BE) ---
export const REPORT_SOURCES = ["WEB", "PHONE", "EMAIL", "OTHER"] as const;
if (!Array.isArray(REPORT_SOURCES) || !REPORT_SOURCES.length) {
  console.warn('[API] REPORT_SOURCES non definito o vuoto – controllare build.');
}

export const REPORT_PRIVACY = ["ANONIMO", "CONFIDENZIALE"] as const;
export const REPORT_STATUS  = ["OPEN", "IN_PROGRESS", "SUSPENDED", "NEED_INFO", "CLOSED"] as const;

export const PRESIGN_ENABLED = String(import.meta.env.VITE_PRESIGN_ENABLED || "").toLowerCase() === "true";
export const REPORTS_API_ENABLED = String(import.meta.env.VITE_REPORTS_API_ENABLED ?? "true").toLowerCase() !== "false";

// Tipi comodi
export type Cuid = string;

// Helper canale coerente tra record legacy (source) e nuovi (channel)
export function resolveChannel(it: { channel?: string; source?: string }) {
  return (it?.channel as string | undefined) ?? (it?.source as string | undefined) ?? "OTHER";
}

// Sanitizzazione filename per storageKey
export function safeFilename(name: string): string {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 128);
}

/** Istanza Axios: baseURL dal ENV, cookie-first */
const api = axios.create({
  baseURL: ORIGIN,
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/** x-tenant-id helpers (solo dove serve, es. login) */
const TENANT_ID_KEY = "lmw_client_id"; // legacy key usata dal FE
const ALT_TENANT_ID_KEY = "lmw_tenant_id"; // nuova key richiesta per dev

function getTenantId(): string | undefined {
  // Attivo solo in sviluppo
  if (!import.meta.env.DEV) return undefined;

  // a) Env esplicita
  const envTid = (import.meta.env.VITE_DEV_TENANT_ID as string | undefined);
  if (envTid && envTid.trim()) return envTid.trim();

  // b) Parametro URL ?tenant=<id>
  try {
    const srch = typeof window !== "undefined" ? window.location.search : "";
    if (srch) {
      const p = new URLSearchParams(srch);
      const qTid = p.get("tenant");
      if (qTid && qTid.trim()) return qTid.trim();
    }
  } catch { /* ignore */ }

  // c) Storage: nuova key, poi legacy key
  try {
    const lsNew = localStorage.getItem(ALT_TENANT_ID_KEY);
    if (lsNew && lsNew.trim()) return lsNew.trim();
    const lsLegacy = localStorage.getItem(TENANT_ID_KEY);
    if (lsLegacy && lsLegacy.trim()) return lsLegacy.trim();
  } catch { /* ignore */ }

  // d) Sottodominio (es. acme.localhost, acme.dev.lmk.app)
  try {
    const host = typeof window !== "undefined" ? window.location.hostname : ""; // no port
    if (host && host.includes(".")) {
      const parts = host.split(".");
      const first = parts[0];
      // escludi host comuni che non sono tenant
      if (first && first.toLowerCase() !== "www" && first.toLowerCase() !== "localhost") {
        return first;
      }
      // caso speciale: acme.localhost
      if (parts.length >= 2 && parts[1].toLowerCase() === "localhost" && first && first.toLowerCase() !== "www") {
        return first;
      }
    }
  } catch { /* ignore */ }

  // e) Nessun tenantId
  return undefined;
}

export function saveTenantId(clientId?: string) {
  if (!clientId) return;
  try { localStorage.setItem(TENANT_ID_KEY, clientId); } catch {}
}
export function getSavedTenantId() { return getTenantId(); }
// cookie-first: nessun tokenStore; logout lato FE pulisce solo storage locale dove serve
export function frontendLogout() {
  try { localStorage.removeItem("lmw_session"); } catch {}
}

/** === MFA context (sessionStorage) === */
const MFA_TOKEN_KEY   = "lmw_mfa_token";
const MFA_METHODS_KEY = "lmw_mfa_methods";

export function saveMfaContext(data: { token?: string; methods?: string[] } = {}) {
  try {
    if (data.token) sessionStorage.setItem(MFA_TOKEN_KEY, data.token);
    if (data.methods) sessionStorage.setItem(MFA_METHODS_KEY, JSON.stringify(data.methods));
  } catch {}
}
export function getMfaToken(): string | null {
  try { return sessionStorage.getItem(MFA_TOKEN_KEY); } catch { return null; }
}
export function clearMfaContext() {
  try {
    sessionStorage.removeItem(MFA_TOKEN_KEY);
    sessionStorage.removeItem(MFA_METHODS_KEY);
  } catch {}
}

/** Refresh via cookie gestito con single-flight queue */

/** Interceptor REQUEST */
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  // forza cookie sempre
  (config as any).withCredentials = true;

  const urlStr = String(config.url || "").toLowerCase();
  const isLoginRoute = urlStr.includes("tenant/auth/login");
  const isMfaRoute = urlStr.includes("tenant/auth/mfa/");
  const isRefreshRoute = urlStr.includes("tenant/auth/refresh");

  // IMPORTANTISSIMO: niente Authorization per la sessione. Consentito SOLO per rotte MFA.
  // Usiamo cookie HttpOnly lato server per la sessione.
  if (!isMfaRoute) {
    if ((config.headers as any).Authorization) delete (config.headers as any).Authorization;
    if ((config.headers as any).authorization) delete (config.headers as any).authorization;
  }

  // refresh: nessun body e nessun Content-Type esplicito
  if (isRefreshRoute && config.headers && 'Content-Type' in (config.headers as any)) {
    delete (config.headers as any)['Content-Type'];
  }

  // x-tenant-id SOLO sul login tenant
  if (isLoginRoute) {
    try {
      const explicit = (typeof localStorage !== 'undefined') ? localStorage.getItem("x-tenant-id") : "";
      const fallbackA = (typeof localStorage !== 'undefined') ? localStorage.getItem(TENANT_ID_KEY) : "";
      const fallbackB = (typeof localStorage !== 'undefined') ? localStorage.getItem(ALT_TENANT_ID_KEY) : "";
      const tenantId = explicit || fallbackA || fallbackB || "";
      if (tenantId) (config.headers as any)["x-tenant-id"] = tenantId;
    } catch { /* ignore */ }
  } else {
    // Difesa: rimuovi x-tenant-id da tutte le altre richieste
    if ((config.headers as any)["x-tenant-id"]) delete (config.headers as any)["x-tenant-id"];
  }

  if (typeof config.url === "string") {
    // Prefissa sempre i path relativi con il PREFIX tramite helper v1
    if (!/^https?:\/\//i.test(config.url)) {
      config.url = v1(config.url);
    }
  }

  return config;
});

/** Interceptor RESPONSE: cattura 428 -> salva mfaToken e segnala mfaRequired */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config || {};
    if (status === 428) {
      const body = err?.response?.data ?? {};
      const headers = (err?.response?.headers ?? {}) as Record<string, any>;

      // Estrazione mfaToken da body e da header (tollerante)
      let mfaToken: string | null =
        body?.mfaToken ||
        body?.mfa_token ||
        body?.mfa?.token ||
        body?.token || // alcuni BE usano 'token' per il token MFA nel 428
        null;

      if (!mfaToken) {
        const h = headers;
        // Prova varie chiavi comuni (in lowercase)
        mfaToken =
          h["mfa-token"] ||
          h["x-mfa-token"] ||
          h["x-auth-mfa"] ||
          h["x-auth-mfa-token"] ||
          h["x-mfa"] ||
          null;
      }

      const methods = body?.methods || body?.mfa?.methods || [];

      if (mfaToken) {
        saveMfaContext({ token: mfaToken, methods });
      }

      const mfaErr: any = new Error("MFA_REQUIRED");
      mfaErr.mfaRequired = true;
      mfaErr.methods = methods;
      // Preserva la response originale per permettere al caller di leggere body/headers
      try { mfaErr.response = err?.response; } catch {}
      try { mfaErr.config = err?.config; } catch {}
      try { mfaErr.status = 428; } catch {}

      // Log esteso per debug
      try {
        const hdrKeys = Object.keys(headers || {});
        console.debug("[MFA] 428 received. token=", !!mfaToken, "methods=", methods, "hdr=", hdrKeys);
        if (!mfaToken) console.debug("[MFA] 428 body:", body);
      } catch {}
      return Promise.reject(mfaErr);
    }

    // 403 tenant non-billing: reindirizza al billing lock con messaggio
    if (status === 403) {
      try {
        const urlStr = String(err?.config?.url || "").toLowerCase();
        const isTenant = urlStr.includes("/tenant/");
        const isBilling = urlStr.includes("/tenant/billing/") || urlStr.includes("/public/billing/");
        if (isTenant && !isBilling) {
          const msgRaw = err?.response?.data?.message || "";
          const msg = String(msgRaw).toLowerCase();
          if (msg.includes("pagamento") || msg.includes("sospeso") || msg.includes("archiviato")) {
            try { sessionStorage.setItem("lmw_billing_lock_msg", msgRaw || "Accesso limitato: completa il pagamento."); } catch {}
            window.location.hash = "#/settings?tab=billing";
          }
        }
      } catch { /* ignore */ }
    }

    // 401 -> refresh ultra-conservativo: mai su rotte auth/public/MFA/refresh, una sola volta sulle altre
    if (status === 401 && original) {
      const cfg: any = original || {};
      const urlStr: string = (cfg.url || "").toString();

      // Rotte da NON triggerare: auth/public e la stessa refresh
      const isAuthRoute = /\/v1\/(tenant\/auth|public\/auth)\//.test(urlStr);
      const isRefreshCall = /\/v1\/tenant\/auth\/refresh$/.test(urlStr);
      const hasMfaHeader = !!(err?.response?.headers?.["x-auth-mfa"] || err?.response?.headers?.["x-mfa-token"]);
      if (isAuthRoute || isRefreshCall || hasMfaHeader) {
        return Promise.reject(err);
      }

      if (!cfg.__isRetry) {
        try {
          if (!(window as any).__lmw_refreshing) {
            (window as any).__lmw_refreshing = (async () => {
              await api.post(v1("tenant/auth/refresh"), undefined, {
                withCredentials: true,
                transformRequest: [(_data, headers) => {
                  try { if (headers) delete (headers as any)["Content-Type"]; } catch {}
                  return undefined; // nessun body
                }],
              });
            })().finally(() => {
              (window as any).__lmw_refreshing = null;
            });
          }
          await (window as any).__lmw_refreshing;
          cfg.__isRetry = true;
          return api.request(cfg);
        } catch {
          return Promise.reject(err);
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// --- Reports client (typed) ---

export type ListReportsParams = {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  priority?: string[];
  category?: string[];
  assignee?: string[];
  channel?: ("WEB" | "PHONE" | "EMAIL" | "OTHER")[];
};

/**
 * Estrae il payload da un JWT (senza verificarlo) e restituisce un oggetto.
 */
// cookie-first: nessuna decodifica JWT lato FE

/**
 * Restituisce il clientId per le chiamate lista report.
 * PrioritÃ :
 *  a) dal JWT (campo clientId/tenantId)
 *  b) (se disponibile) da storage legacy
 *  c) fallback da localStorage (lmw_client_id | lmw_tenant_id)
 *  d) fallback finale solo DEV: VITE_DEV_TENANT_ID
 */
function getClientId(): string | undefined {
  // cookie-first: preferisci tenantId risolto/localStorage
  const resolved = getTenantId();
  if (resolved && resolved.trim()) return resolved.trim();
  try {
    const lsLegacy = localStorage.getItem(TENANT_ID_KEY);
    if (lsLegacy && lsLegacy.trim()) return lsLegacy.trim();
  } catch { /* ignore */ }
  try {
    const lsNew = localStorage.getItem(ALT_TENANT_ID_KEY);
    if (lsNew && lsNew.trim()) return lsNew.trim();
  } catch { /* ignore */ }
  if (import.meta.env.DEV) {
    const envTid = (import.meta.env.VITE_DEV_TENANT_ID as string | undefined);
    if (envTid && envTid.trim()) return envTid.trim();
  }
  return undefined;
}

export async function listReports(params?: ListReportsParams): Promise<Report[]> {
  const query: Record<string, any> = { ...(params || {}) };
  // --- Append clientId query param (required by backend) ---
  const clientId = getClientId();
  if (clientId && query.clientId == null) query.clientId = clientId;
  // Pass-through dei parametri per futura compatibilitÃ  server-side
  const { data } = await api.get(v1("tenant/reports"), {
    params: query,
  });
  const items: Report[] = Array.isArray(data) ? (data as any) : [];
  return items;
}

export async function getReportMessages(reportId: string): Promise<ReportMessage[]> {
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}/messages`));
  return Array.isArray(data) ? data : [];
}

export async function updateReportStatus(reportId: string, nextStatus: string): Promise<{ message?: string; newStatus?: string }> {
  const clientId = getClientId();
  const body: Record<string, any> = { clientId, reportId, status: nextStatus };
  const { data } = await api.patch(v1(`tenant/reports/${encodeURIComponent(reportId)}/status`), body);
  return (data as any) || {};
}

// Minimal create report API for NewReport instrumentation
export async function createReport(data: any) {
  return api.post(v1("tenant/reports"), data);
}

// --- Messages ---
export async function postReportMessage(input: { reportId: string; body: string; visibility: "INTERNAL" | "PUBLIC" }) {
  const { data } = await api.post(v1("tenant/reports/message"), input);
  return data as any;
}

// --- Lookups (public) ---
export type Department = { id: Cuid; name: string };
export type Category = { id: Cuid; name: string; departmentId: Cuid };

const lookupsCache: Map<string, any> = new Map();
function getTenantKey(): string {
  try { return getTenantId() || "default"; } catch { return "default"; }
}
export function clearReportsLookupsCache() {
  lookupsCache.clear();
}

export async function fetchDepartments(): Promise<Department[]> {
  const key = `dept:${getTenantKey()}`;
  if (lookupsCache.has(key)) return lookupsCache.get(key);
  const { data } = await api.get(v1("public/departments"));
  const list = Array.isArray(data) ? (data as any) : [];
  lookupsCache.set(key, list);
  return list;
}

export async function fetchCategories(departmentId?: string): Promise<Category[]> {
  const dep = String(departmentId || "all");
  const key = `cat:${getTenantKey()}:${dep}`;
  if (lookupsCache.has(key)) return lookupsCache.get(key);
  const { data } = await api.get(v1("public/categories"), { params: departmentId ? { departmentId } : {} });
  const list = Array.isArray(data) ? (data as any) : [];
  lookupsCache.set(key, list);
  return list;
}

// --- Cookie-first helpers ---
export async function refreshAccess(): Promise<string | null> {
  try {
    const res = await api.post(v1("tenant/auth/refresh"), undefined, {
      withCredentials: true,
      validateStatus: (s) => s >= 200 && s < 500,
      transformRequest: [(_data, headers) => {
        try { if (headers) delete (headers as any)['Content-Type']; } catch {}
        return undefined; // nessun body
      }],
    });
    if (res.status >= 200 && res.status < 300) {
      try { localStorage.setItem("lmw_session", "1"); } catch {}
      return "ok";
    }
    return null;
  } catch {
    return null;
  }
}









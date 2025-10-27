// src/lib/api.ts
import axios from "axios";

import type { Report, ReportMessage } from "./report.dto";

/** ENV lette da Vite */
const RAW_BASE   = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const RAW_PREFIX = (import.meta.env.VITE_API_PREFIX    as string | undefined) ?? "/v1";

/** Restituisce SOLO origin (protocol + host + porta), ignorando path & query */
function hostOrigin(url: string | undefined): string {
  const fallback = "http://localhost:3000";
  if (!url || !url.trim()) return fallback;
  const s = url.trim();

  // Solo porta (:3000 o 3000)
  if (/^:?\d+($|\/)/.test(s)) {
    const port = s.startsWith(":") ? s.slice(1) : s;
    return `http://localhost:${port.replace(/\/.*$/, "")}`;
  }

  const withProto = /^https?:\/\//i.test(s) ? s : `http://${s.replace(/^\/+/, "")}`;
  try {
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

/** Normalizza prefix: UNO slash iniziale, nessuno finale */
function normalizePrefix(p: string): string {
  let s = (p || "").trim();
  if (!s) return "/v1";
  s = "/" + s.replace(/^\/+/, "").replace(/\/+$/, "");
  return s;
}

const IS_DEV = import.meta.env.DEV;
const BASE_ORIGIN = IS_DEV ? "" : hostOrigin(RAW_BASE);
const PREFIX      = normalizePrefix(RAW_PREFIX);

console.log("[API] origin =", BASE_ORIGIN, "prefix =", PREFIX);

/** Sanifica path/URL per le API */
function sanitizeRelativePath(u: string): string {
  let p = String(u || "").trim();

  if (/^https?:\/\//i.test(p)) {
    try {
      const full = new URL(p);
      p = full.pathname + (full.search || "");
    } catch { /* ignore */ }
  }

  const qIdx = p.indexOf("?");
  const pathname = (qIdx >= 0 ? p.slice(0, qIdx) : p) || "";
  const query = qIdx >= 0 ? p.slice(qIdx) : "";

  let clean = pathname.replace(/^\/+/, "");
  clean = clean.replace(/^(api\/)?v1\/+/, "");

  return `${PREFIX}/${clean}${query}`;
}

/** Helper pubblico per costruire endpoint */
export function v1(path: string): string {
  return sanitizeRelativePath(path);
}

// --- Public enums (aligned to BE) ---
export const REPORT_SOURCES = ["WEB", "PHONE", "EMAIL", "OTHER"] as const;
if (!Array.isArray(REPORT_SOURCES) || !REPORT_SOURCES.length) {
  console.warn('[API] REPORT_SOURCES non definito o vuoto � controllare build.');
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

/** Istanza Axios (baseURL = SOLO origin; il path lo aggiunge v1() o l'interceptor) */
const api = axios.create({
  baseURL: BASE_ORIGIN, // in dev stringa vuota per usare proxy Vite same-origin
  withCredentials: true, // cookie HttpOnly sempre
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
    if (!/^https?:\/\//i.test(config.url)) {
      config.url = sanitizeRelativePath(config.url);
    } else {
      try {
        // Se abbiamo una base origin (solo prod), converti eventuali URL assoluti della stessa origin a path con prefisso v1.
        if (BASE_ORIGIN) {
          const u = new URL(config.url);
          if (`${u.protocol}//${u.host}` === BASE_ORIGIN) {
            const fixed = sanitizeRelativePath(u.pathname + (u.search || ""));
            config.url = BASE_ORIGIN + fixed;
          }
        }
      } catch { /* ignore */ }
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
 * Priorità:
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
  // Pass-through dei parametri per futura compatibilità server-side
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






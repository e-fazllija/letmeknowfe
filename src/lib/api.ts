// src/lib/api.ts
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const DEV = (import.meta as any).env?.DEV;

// Base & Prefix
const RAW_BASE = ((import.meta as any).env?.VITE_API_BASE_URL ?? "") as string;
const RAW_PREFIX = ((import.meta as any).env?.VITE_API_PREFIX ?? "/v1") as string;
const BASE = normalizeBase(RAW_BASE);
const PREFIX = normalizePrefix(RAW_PREFIX);

function normalizeBase(b: string) {
  if (!b || b === "/") return ""; // usa proxy in dev
  return b.replace(/\/+$/, "");
}
function normalizePrefix(p: string) {
  if (!p) return "/v1";
  return p.startsWith("/") ? p : `/${p}`;
}
function buildUrl(path: string) {
  // in dev preferiamo sempre URL relativo al proxy /v1
  const final = `${PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
  if (DEV) console.log("[api] buildUrl →", final);
  if (BASE) return `${BASE}${final}`;
  return final;
}

function isPublicPath(path: string) {
  return path.startsWith("/public/");
}

// Fallback robusto per ottenere il tenant
function readTenantId(): string {
  // 1) Query string (?tenant=...)
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQs = (qs.get("tenant") || "").trim();
    if (fromQs) return fromQs;
  } catch {}

  // 2) LocalStorage
  try {
    const fromLs = (localStorage.getItem("lmw_tenant_id") || "").trim();
    if (fromLs) return fromLs;
  } catch {}

  // 3) Env
  const fromEnv = (((import.meta as any).env?.VITE_PUBLIC_TENANT_ID as string) || "").trim();
  return fromEnv;
}

async function request<T>(method: HttpMethod, path: string, body?: any, extraHeaders?: HeadersInit): Promise<T> {
  const url = buildUrl(path);

  // tenant
  const tenantRaw = readTenantId();
  const tenant = tenantRaw.trim();
  if (DEV) {
    console.log("[api] tenant env raw:", JSON.stringify(((import.meta as any).env?.VITE_PUBLIC_TENANT_ID || "")));
    console.log("[api] tenant used (trimmed):", JSON.stringify(tenant));
  }

  const headers = new Headers(extraHeaders || {});
  // x-tenant-id SOLO per rotte public/*
  if (isPublicPath(path)) {
    headers.set("x-tenant-id", tenant);
  }

  // Per GET non settiamo Content-Type (evitiamo preflight)
  if (method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const options: RequestInit = {
    method,
    headers,
    credentials: "omit",
  };
  if (body !== undefined && method !== "GET") {
    options.body = headers.get("Content-Type")?.includes("application/json") ? JSON.stringify(body) : body;
  }

  const res = await fetch(url, options);

  // Proviamo a leggere JSON sempre; se non è JSON, proviamo testo per log
  const contentType = res.headers.get("content-type") || "";
  let parsed: any = null;
  if (contentType.includes("application/json")) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  } else {
    const text = await res.text();
    if (DEV) console.error("[api] non-JSON response", text.slice(0, 200));
    parsed = text;
  }

  if (!res.ok) {
    if (DEV) console.error("[api] HTTP error", res.status, parsed);
    throw new ApiError(
      (parsed && (parsed.message || parsed.error)) || `HTTP ${res.status}`,
      res.status,
      parsed
    );
  }

  return parsed as T;
}

// Helper assoluto per PUT presign (uploadUrl firmato esterno a BASE/PREFIX)
export async function putAbsolute<T>(absoluteUrl: string, rawBody: BodyInit, headersIn?: HeadersInit) {
  const res = await fetch(absoluteUrl, {
    method: "PUT",
    headers: headersIn,
    body: rawBody,
    credentials: "omit",
  });
  if (!res.ok) {
    const text = await res.text();
    if (DEV) console.error("[api] PUT absolute error", res.status, text.slice(0, 200));
    throw new ApiError(text || `HTTP ${res.status}`, res.status, text);
  }
  // ETag utile nel finalize
  return {
    etag: res.headers.get("ETag") || res.headers.get("etag") || undefined,
  } as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: any, headers?: HeadersInit) => request<T>("POST", path, body, headers),
  put: <T>(path: string, body: any, headers?: HeadersInit) => request<T>("PUT", path, body, headers),
  delete: <T>(path: string) => request<T>("DELETE", path),
};


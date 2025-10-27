// src/lib/tenantAuth.service.ts
import api, { v1, saveMfaContext, clearMfaContext } from "@/lib/api";
import { getDevTenantId } from "@/lib/tenant.dev";

// Simple backoff helper for 429
async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000, 4000, 4000];
  let attempt = 0;
  // up to 5 attempts total
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.response?.status || e?.status;
      const retryAfter = Number(e?.response?.headers?.["retry-after"] || e?.response?.headers?.["Retry-After"]);
      if (status === 429 && attempt < delays.length) {
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delays[attempt];
        attempt++;
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

export type LoginRes = {
  message?: string;
  user?: any;
  accessToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
};

// Build absolute origin from env (same approach used in publicAuth.service)
function apiOrigin(): string {
  const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  try {
    if (!RAW_BASE) return "";
    const withProto = /^https?:\/\//i.test(RAW_BASE) ? RAW_BASE : `http://${String(RAW_BASE).replace(/^\/+/, "")}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch { return ""; }
}

export async function tenantLogin(tenantId: string, email: string, password: string): Promise<LoginRes> {
  const origin = apiOrigin();
  const url = `${origin}${v1("tenant/auth/login")}`;
  const headers = new Headers({ "Content-Type": "application/json" });
  const tId = (tenantId || "").trim() || getDevTenantId();
  if (tId) headers.set("x-tenant-id", tId);

  const doReq = async () => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ email, password }),
    });
    // 428 passthrough
    if (res.status === 428) {
      const body = await res.json().catch(() => ({}));
      const setupToken = body?.setupToken || body?.token;
      if (setupToken) saveMfaContext({ token: setupToken, methods: body?.methods || body?.mfa?.methods });
      const err: any = new Error("MFA_SETUP_REQUIRED");
      err.status = 428; err.requireMfaSetup = true; err.setupToken = setupToken; err.setupUrl = body?.setupUrl; err.body = body;
      throw err;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err: any = new Error(text || `Login failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    if (data?.mfaRequired) {
      if (data?.mfaToken) saveMfaContext({ token: data.mfaToken, methods: data?.methods || data?.mfa?.methods });
      return { mfaRequired: true, mfaToken: data?.mfaToken } as LoginRes;
    }
    // cookie-first: nessun salvataggio token lato FE
    return data as LoginRes;
  };

  return withBackoff(doReq);
}

export async function signupTenantUser(input: { clientId: string; email: string; password: string; role: "ADMIN"|"AGENT"; }) {
  const body = { clientId: input.clientId, email: input.email, password: input.password, role: input.role };
  const { data } = await api.post(v1("tenant/auth/signup"), body, { headers: { "Content-Type": "application/json" } });
  return (data as any) || {};
}

export async function refresh(): Promise<{ accessToken: string | undefined }> {
  // Nessun retry su 429 per refresh; delega alla coda dell'interceptor
  const { data } = await api.post(v1("tenant/auth/refresh"), undefined, {
    withCredentials: true,
    validateStatus: (s) => s >= 200 && s < 500,
    transformRequest: [(_data, headers) => {
      try { if (headers) delete (headers as any)['Content-Type']; } catch {}
      return undefined; // nessun body
    }],
  });
  const token = (data as any)?.accessToken || (data as any)?.token;
  return { accessToken: token };
}

export async function logout(): Promise<void> {
  try { await withBackoff(() => api.post(v1("tenant/auth/logout"), {}, { withCredentials: true })); } catch {}
}

// === MFA endpoints (tenant) ===
export async function mfaSetup(setupToken: string): Promise<{ otpauthUrl: string; secret?: string; expiresIn?: number; qrImage?: string }> {
  const headers: Record<string, any> = { Authorization: `Bearer ${setupToken}` };
  if (import.meta.env.DEV) (headers as any)["x-mfa-token"] = setupToken;
  const { data } = await withBackoff(() => api.post(v1("tenant/auth/mfa/setup"), {}, { headers, withCredentials: true }));
  return (data as any) || {};
}

export async function mfaVerify(setupToken: string, code: string): Promise<{ message?: string; recoveryCodes?: string[] }> {
  const headers: Record<string, any> = { Authorization: `Bearer ${setupToken}` };
  if (import.meta.env.DEV) (headers as any)["x-mfa-token"] = setupToken;
  const { data } = await withBackoff(() => api.post(v1("tenant/auth/mfa/verify"), { code }, { headers, withCredentials: true }));
  return (data as any) || {};
}

export async function mfaComplete(mfaToken: string, code: string): Promise<{ message?: string; user?: any; accessToken?: string }> {
  const origin = apiOrigin();
  const url = `${origin}${v1("tenant/auth/mfa/complete")}`;
  const headers = new Headers({ "Content-Type": "application/json", Authorization: `Bearer ${mfaToken}` });
  if (import.meta.env.DEV) headers.set("x-mfa-token", mfaToken);
  const res = await fetch(url, { method: "POST", credentials: "include", headers, body: JSON.stringify({ code }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error((data as any)?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  try { clearMfaContext(); } catch {}
  return (data as any) || {};
}

// === OTP verify (login MFA) — no retry/backoff ===
export async function verifyOtpOnce(code: string, mfaToken: string) {
  return api.post(v1("tenant/auth/mfa/verify"), { code }, {
    headers: { 'x-mfa-token': mfaToken },
    withCredentials: true,
    validateStatus: (s) => s >= 200 && s < 500,
  });
}

export async function verifyOtp(code: string, mfaToken: string) {
  // wrapper esplicito senza backoff
  return verifyOtpOnce(code, mfaToken);
}

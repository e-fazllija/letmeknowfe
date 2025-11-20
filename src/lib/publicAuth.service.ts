import api, { v1 } from "@/lib/api";

const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

function hostOrigin(url?: string): string {
  try {
    if (!url) return "";
    const withProto = /^https?:\/\//i.test(url) ? url : `http://${String(url).replace(/^\/+/, "")}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

function buildPublicUrl(path: string): string {
  const origin = hostOrigin(RAW_BASE) || "";
  return `${origin}${v1(path)}`;
}

async function postPublic<T>(path: string, body: any): Promise<{ res: Response; data: T }> {
  const url = buildPublicUrl(path);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { res, data };
}

/** Attiva account owner dal link ricevuto via email (selector + token + nuova password) */
export async function activateOwner(params: { selector: string; token: string; password: string }) {
  const { data } = await api.post(v1("public/auth/activate"), params);
  return data as { message: string };
}

// New name aligned to spec; keep both for compatibility
export async function activateAccount(input: { selector: string; token: string; password: string }): Promise<{ message: string }> {
  // Build absolute URL using env origin + v1 path; avoid axios interceptors to ensure no cookies and no x-tenant-id
  const { res, data } = await postPublic<{ message?: string }>("public/auth/activate", input);
  if (!res.ok) {
    const err: any = new Error((data as any)?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return (data as any) || { message: "OK" };
}

/** Reinvio link owner INVITED (clientId obbligatorio, email facoltativa) */
export async function resendOwnerInvite(input: { clientId: string; email?: string }): Promise<{ message?: string }> {
  const { res, data } = await postPublic<{ message?: string }>("public/auth/resend-owner-invite", input);
  if (!res.ok) {
    const err: any = new Error((data as any)?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Aggiorna email owner INVITED, rigenera token e reinvia */
export async function changeOwnerEmail(input: { clientId: string; newEmail: string }): Promise<{ message?: string }> {
  const { res, data } = await postPublic<{ message?: string }>("public/auth/change-owner-email", input);
  if (!res.ok) {
    const err: any = new Error((data as any)?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

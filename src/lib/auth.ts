// src/lib/auth.ts
import api, { v1 } from "./api";

export type Role = "admin" | "user" | "superhost";

const EMAIL_KEY = "lmw_user_email";
const ROLE_KEY = "lmw_user_role";
const TENANT_KEY = "lmw_client_id";

function setEmail(email: string) {
  try { localStorage.setItem(EMAIL_KEY, email); } catch {}
}
export function setRoleDirect(role: Role) {
  try { localStorage.setItem(ROLE_KEY, role); } catch {}
}
function setTenantId(id: string) {
  try { localStorage.setItem(TENANT_KEY, id); } catch {}
}
export function getUserEmail(): string {
  try { return localStorage.getItem(EMAIL_KEY) || ""; } catch { return ""; }
}

export function useRole(): Role {
  try {
    const saved = localStorage.getItem(ROLE_KEY);
    if (saved === "admin" || saved === "user" || saved === "superhost") return saved as Role;
  } catch {}
  return "user";
}

export interface SignupPayload {
  email: string;
  password: string;
  clientId?: string;
  role?: "ADMIN" | "AGENT";
  [k: string]: any;
}
export interface LoginPayload {
  email: string;
  password: string;
}

/** POST /v1/tenant/auth/signup */
export async function signupTenantUser(payload: SignupPayload) {
  const storedTenant = localStorage.getItem(TENANT_KEY) || undefined;
  const body = { ...payload, clientId: payload.clientId ?? storedTenant };

  const res = await api.post(v1("tenant/auth/signup"), body);
  const data: any = res.data ?? {};
  // cookie-first: nessun salvataggio token lato FE

  const email = data?.email ?? payload.email;
  if (email) setEmail(email);

  const clientId = body.clientId ?? data?.user?.clientId ?? data?.clientId ?? data?.tenantId;
  if (clientId) setTenantId(clientId);

  const beRole: string | undefined = data?.user?.role ?? data?.role;
  const decidedRole: Role =
    beRole
      ? (String(beRole).toUpperCase() === "ADMIN" ? "admin" : "user")
      : (String(payload.role || "").toUpperCase() === "ADMIN" ? "admin" : "user");
  setRoleDirect(decidedRole);

  try { localStorage.setItem("lmw_session", "1"); } catch {}

  return data;
}

/** POST /v1/tenant/auth/login */
export async function loginTenantUser(payload: LoginPayload) {
  const tenantId = localStorage.getItem(TENANT_KEY) || undefined;
  const body = { ...payload, clientId: tenantId };

  const res = await api.post(v1("tenant/auth/login"), body);
  const data: any = res.data ?? {};
  // cookie-first: nessun salvataggio token lato FE

  setEmail(payload.email);

  const clientId = data?.user?.clientId ?? data?.clientId ?? data?.tenantId ?? tenantId;
  if (clientId) setTenantId(clientId);

  const beRole: string | undefined = data?.user?.role ?? data?.role;
  if (typeof beRole === "string") {
    const r: Role = String(beRole).toUpperCase() === "ADMIN" ? "admin" : "user";
    setRoleDirect(r);
  } else {
    const emailLow = (payload.email || "").toLowerCase();
    if (emailLow.includes("+superhost") || emailLow.startsWith("superhost@")) {
      setRoleDirect("superhost");
    }
  }

  return data;
}

export function logout() {
  try {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem("lmw_session");
  } catch {}
}

// src/lib/mfa.service.ts
import api, { v1, getMfaToken, clearMfaContext } from "@/lib/api";

export type SetupMfaRes     = { otpauthUrl: string; secret?: string; expiresIn?: number };
export type VerifyMfaRes    = { message: string; recoveryCodes: string[] };
export type CompleteMfaRes  = { user?: any; accessToken?: string; refreshToken?: string };

/**
 * === SETUP MFA (abilitazione TOTP sull'account) ===
 * Richiedono un "setupToken" specifico emesso dal BE (NON quello del login 428).
 */
export async function setupMfa(setupToken: string) {
  const { data } = await api.post(
    v1("tenant/auth/mfa/setup"),
    {},
    { headers: { Authorization: `Bearer ${setupToken}` }, withCredentials: true }
  );
  return data as SetupMfaRes;
}

export async function verifyMfa(setupToken: string, code: string) {
  const { data } = await api.post(
    v1("tenant/auth/mfa/verify"),
    { code },
    { headers: { Authorization: `Bearer ${setupToken}` }, withCredentials: true }
  );
  return data as VerifyMfaRes;
}

/**
 * === LOGIN MFA (dopo risposta 428) ===
 * Usa automaticamente l'mfaToken salvato dall'interceptor in sessionStorage.
 * Salva access/refresh token e pulisce il contesto MFA.
 */
export async function verifyLoginTotp(code: string) {
  const mfaToken = getMfaToken();
  if (!mfaToken) throw new Error("Missing MFA token. Try logging in again.");

  const { data } = await api.post(
    v1("tenant/auth/mfa/complete"),
    { code },
    { headers: { Authorization: `Bearer ${mfaToken}`, "x-mfa-token": mfaToken }, withCredentials: true }
  );

  if (data?.accessToken) localStorage.setItem("lmw_token", data.accessToken);
  if (data?.refreshToken) localStorage.setItem("lmw_refresh_token", data.refreshToken);

  // Inizializza utente "light" anche nel percorso compatibile
  try {
    const email = localStorage.getItem("lmw_user_email") || data?.user?.email || "";
    const beRoleRaw: string | undefined = data?.user?.role ?? data?.role;
    let role: "admin" | "user" | "superhost" = "user";
    if (typeof beRoleRaw === "string" && beRoleRaw) {
      const upper = beRoleRaw.toUpperCase();
      role = upper === "ADMIN" ? "admin" : upper === "SUPERHOST" ? "superhost" : "user";
    }
    localStorage.setItem("lmw_user_email", email);
    localStorage.setItem("lmw_user_role", role);
    localStorage.setItem("letmeknow_auth", JSON.stringify({ email, role }));
  } catch {
    // ignore storage errors
  }

  clearMfaContext();
  return data as CompleteMfaRes;
}

/**
 * === SHIM DI COMPATIBILITÃ€ ===
 * Alcuni punti del FE importano ancora `completeMfa(mfaToken, code)`.
 * Qui lo implementiamo come wrapper verso l'endpoint di verify.
 * - Se passi un mfaToken esplicito, lo usa.
 * - Se non lo passi, usa quello salvato in sessionStorage (come verifyLoginTotp).
 */
export async function completeMfa(mfaTokenOrCode: string, maybeCode?: string) {
  // Supporta sia completeMfa(mfaToken, code) che completeMfa(code) (compat)
  let mfaToken: string | null;
  let code: string;

  if (maybeCode !== undefined) {
    mfaToken = mfaTokenOrCode;
    code = maybeCode;
  } else {
    // firma compatibile: completeMfa(code)
    mfaToken = getMfaToken();
    code = mfaTokenOrCode;
  }

  if (!mfaToken) throw new Error("Missing MFA token. Try logging in again.");

  const { data } = await api.post(
    v1("tenant/auth/mfa/complete"), // usa complete per compatibilità con BE 
    { code },
    { headers: { Authorization: `Bearer ${mfaToken}`, "x-mfa-token": mfaToken }, withCredentials: true }
  );

  if (data?.accessToken) localStorage.setItem("lmw_token", data.accessToken);
  if (data?.refreshToken) localStorage.setItem("lmw_refresh_token", data.refreshToken);
  // Inizializza utente "light" (compat)
  try {
    const email = localStorage.getItem("lmw_user_email") || data?.user?.email || "";
    const beRoleRaw: string | undefined = data?.user?.role ?? data?.role;
    let role: "admin" | "user" | "superhost" = "user";
    if (typeof beRoleRaw === "string" && beRoleRaw) {
      const upper = beRoleRaw.toUpperCase();
      role = upper === "ADMIN" ? "admin" : upper === "SUPERHOST" ? "superhost" : "user";
    }
    localStorage.setItem("lmw_user_email", email);
    localStorage.setItem("lmw_user_role", role);
    localStorage.setItem("letmeknow_auth", JSON.stringify({ email, role }));
  } catch {}

  clearMfaContext();
  return data as CompleteMfaRes;
}


















// src/lib/mfa.api.ts
import api, { v1, getMfaToken, clearMfaContext } from "@/lib/api";

export type MfaSetupRes = { otpauthUrl: string; secret?: string; expiresIn?: number };
export type MfaVerifyRes = { message?: string; recoveryCodes?: string[] };
export type LoginRes = { message?: string; user?: any; accessToken?: string };

export async function mfaSetup(token: string): Promise<MfaSetupRes> {
  const { data } = await api.post(v1("tenant/auth/mfa/setup"), {}, { headers: { Authorization: `Bearer ${token}` } });
  return (data as any) || {};
}

export async function mfaVerify(token: string, code: string): Promise<MfaVerifyRes> {
  const { data } = await api.post(v1("tenant/auth/mfa/verify"), { code }, { headers: { Authorization: `Bearer ${token}` } });
  return (data as any) || {};
}

export async function mfaComplete(token: string): Promise<LoginRes> {
  const { data } = await api.post(v1("tenant/auth/mfa/complete"), {}, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
  if ((data as any)?.accessToken) {
    try {
      localStorage.setItem("lmw_token", (data as any).accessToken);
      localStorage.setItem("access_token", (data as any).accessToken);
    } catch {}
  }
  clearMfaContext();
  return (data as any) || {};
}

export async function mfaRecovery(code: string): Promise<MfaVerifyRes> {
  const token = getMfaToken();
  if (!token) throw new Error("Missing MFA token. Try logging in again.");
  const { data } = await api.post(v1("tenant/auth/mfa/recovery"), { code }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
  return (data as any) || {};
}


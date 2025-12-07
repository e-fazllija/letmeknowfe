// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearReportsLookupsCache, saveMfaContext } from "@/lib/api";
import { me as apiMe, refresh as apiRefresh, logout as apiLogout, completeMfa as apiCompleteMfa, login as apiLogin } from "@/api/api";
import { useNavigate } from "react-router-dom";
import { signupTenantUser } from "@/lib/auth";
import { getBillingStatus } from "@/lib/settings.service";

export type Role = "admin" | "agent" | "user" | "superhost" | "auditor";
export type Permission =
  | "REPORTS_VIEW"
  | "REPORT_CREATE"
  | "REPORTS_MANAGE"
  | "SETTINGS_ADMIN"
  | "REPORTS_READ_MESSAGES"
  | "REPORTS_READ_LOGS"
  | "ATTACHMENTS_PREVIEW";

export type User = { id?: string; email: string; role: Role; permissions?: Permission[] };

// Fase corrente dell'autenticazione
type AuthPhase = 'anon' | 'login' | 'mfa' | 'auth';

type MfaState = {
  required: boolean;
  token?: string | null;
  email?: string | null;
  tenantId?: string | null;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  setUser: (u: User | null) => void;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  signup: (params: { clientId: string; email: string; password: string; role?: "ADMIN" | "AGENT" }) => Promise<void>;
  logout: () => void;
  has: (permission: Permission) => boolean;
  // Additivi, non breaking
  mfa?: MfaState;
  verifyOtp?: (code: string) => Promise<boolean>;
  authPhase?: AuthPhase;
  isMfaMode?: () => boolean;
  ready?: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* --- Storage keys --- */
const STORAGE_KEY = "letmeknow_auth";
const EMAIL_KEY = "lmw_user_email";
const ROLE_KEY  = "lmw_user_role";
const TOKEN_KEY  = "lmw_token";

/* --- Permission map per ruolo (frontend) --- */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superhost: ["REPORTS_VIEW", "REPORT_CREATE", "REPORTS_MANAGE"],
  admin:     ["REPORTS_VIEW", "REPORT_CREATE", "REPORTS_MANAGE"],
  agent:     ["REPORTS_VIEW"],
  auditor:   ["REPORTS_VIEW", "REPORTS_READ_MESSAGES", "REPORTS_READ_LOGS", "ATTACHMENTS_PREVIEW"],
  user:      ["REPORTS_VIEW", "REPORTS_MANAGE"],
};

export const isAuditor = (me?: User | null) => (me?.role === 'auditor');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mfa, setMfa] = useState<MfaState>({ required: false });
  const [authPhase, setAuthPhase] = useState<AuthPhase>('anon');
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Estrae l'ID utente da /me in modo tollerante
  function resolveUserId(data: any): string | undefined {
    try {
      const id = (data?.id ?? data?.sub ?? data?.userId ?? data?.uid ?? data?.internalUserId ?? data?.user_id);
      return id ? String(id) : undefined;
    } catch { return undefined; }
  }

  // Bootstrap live: refresh() + /me (cookie-first)
  useEffect(() => {
    (async () => {
      try {
        await apiRefresh().catch(() => {});
        const data: any = await apiMe();
        if (data) {
          const roleNorm = data.role ? String(data.role).toLowerCase() as Role : undefined;
          const next: User = {
            id: resolveUserId(data),
            email: data.email ?? "",
            role: (roleNorm as Role) ?? ("user" as Role),
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
          };
          if (import.meta.env.DEV) console.log("[auth] bootstrap /me OK", { email: next.email, role: next.role });
          setUser(next);
          setAuthPhase('auth');
        } else {
          if (import.meta.env.DEV) console.warn('[auth] bootstrap /me empty response');
          setUser(null);
          setAuthPhase('anon');
        }
      } catch (err) {
        try { console.warn('[auth] bootstrap FAIL', err); } catch {}
        setUser(null);
        setAuthPhase('anon');
      }
      finally {
        setReady(true);
      }
    })();
  }, []);

  // Evento globale di logout
  const AUTH_LOGOUT_EVENT = "auth:logout";
  function emitGlobalLogout() {
    try { window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT)); } catch {}
  }
  function logoutSilently() {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EMAIL_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      try { localStorage.removeItem("access_token"); } catch {}
      try { localStorage.removeItem("refresh_token"); } catch {}
      localStorage.removeItem("lmw_client_id");
      localStorage.removeItem("x-tenant-id");
      localStorage.removeItem("lmw_first_admin_granted");
      try { sessionStorage.removeItem('lmw_session'); } catch {}
      clearReportsLookupsCache();
    } catch {}
    emitGlobalLogout();
  }

  // Rimozione bootstrap basato su token locali (cookie-first only)
  useEffect(() => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {}
  }, []);

  // Ascolta logout globale (es. intercettori API)
  useEffect(() => {
    const onLogout = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EMAIL_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("lmw_client_id");
      localStorage.removeItem("x-tenant-id");
        clearReportsLookupsCache();
      } catch {}
      setUser(null);
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, []);

  // Refresh silenzioso: spostato nel bootstrap principale (apiRefresh + me)
  useEffect(() => {
    // no-op: handled above
  }, []);

  // Bootstrap profilo su mount: se user incompleto, carica /me
  useEffect(() => {
    try {
      const needsProfile = !user?.email || !user?.role;
      if (!needsProfile) return;
    } catch { return; }

    (async () => {
      try {
        const data: any = await apiMe();
        if (data) {
          const roleNorm = data.role ? String(data.role).toLowerCase() as Role : null;
          setUser({
            id: resolveUserId(data),
            email: data.email ?? (user?.email || null),
            role: (roleNorm as any) ?? (user?.role || null),
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
          } as any);
          setAuthPhase('auth');
          if (import.meta.env.DEV) console.info('[auth] bootstrap /me OK', { email: data.email, role: roleNorm });
        } else {
          console.warn('[auth] /me returned empty body – UI limitata');
        }
      } catch (e) {
        console.warn('[auth] /me bootstrap error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Reagisci a cambiamenti storage – non usiamo token locali (cookie-first) */
  useEffect(() => {
    const onStorage = () => { /* no-op */ };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** LOGIN reale: cookie-first + eventuale MFA */
  const login = async (email: string, password: string, _remember = true) => {
    if (!email || !password) throw new Error("Email e password obbligatorie");
    setAuthPhase('login');
    try { setUser((prev) => ({ email, role: (prev?.role || 'user') as Role, permissions: prev?.permissions })); } catch {}
    try {
      const out: any = await apiLogin(email.trim(), password);
      if (out?.mfaRequired) {
        const token = out?.mfaToken || null;
        try { if (token) saveMfaContext({ token }); } catch {}
        setMfa({ required: true, token, email, tenantId: null });
        setAuthPhase('mfa');
        return;
      }
      const data: any = await apiMe();
      if (data) {
        const roleNorm = data.role ? String(data.role).toLowerCase() as Role : 'user';
        setUser({ id: resolveUserId(data), email: data.email ?? email, role: (roleNorm as Role), permissions: Array.isArray(data.permissions) ? data.permissions : [] });
        setAuthPhase('auth');
        try {
          const status: any = await getBillingStatus().catch(() => null);
          const billingLocked = !!status?.billingLocked;
          const clientStatus = String(status?.clientStatus || "").toUpperCase();
          const lockMessage =
            status?.lockMessage ||
            (billingLocked
              ? clientStatus === "SUSPENDED"
                ? "Account sospeso per mancato pagamento."
                : clientStatus === "PENDING_PAYMENT"
                ? "Completa il pagamento per attivare l'account."
                : clientStatus === "ARCHIVED"
                ? "Account archiviato: contatta il supporto per maggiori dettagli."
                : "Accesso limitato: completa il pagamento."
              : "");
          if (billingLocked) {
            try {
              if (lockMessage) sessionStorage.setItem("lmw_billing_lock_msg", lockMessage);
            } catch {}
            navigate('/settings?tab=billing', { replace: true });
            return;
          }
          navigate('/home', { replace: true });
        } catch {
          navigate('/home', { replace: true });
        }
        return;
      }
      setAuthPhase('login');
    } catch (e) {
      throw e;
    }
  };

  /** SIGNUP reale (non fa auto-login) */
  const signup: AuthContextType["signup"] = async ({ clientId, email, password, role = "ADMIN" }) => {
    if (!clientId) throw new Error("clientId obbligatorio per signup");
    await signupTenantUser({ clientId, email, password, role });
  };

  /** LOGOUT: pulizia completa */
  const logout = async () => {
    try { await apiLogout(); } catch {}
    try { logoutSilently(); setAuthPhase('anon'); } finally { navigate("/login", { replace: true }); }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    if (!mfa.required || !mfa.token) throw new Error("MFA non inizializzato");
    const clean = String(code || '').replace(/\D/g, '');
    try {
      await apiCompleteMfa(mfa.token, clean);
      setMfa({ required: false, token: null, email: null, tenantId: null });
      // Load profile
      try {
        const data: any = await apiMe();
        if (data) {
          setUser({
            id: resolveUserId(data),
            email: (data as any).email ?? (mfa.email || ''),
            role: (data as any).role ? String((data as any).role).toLowerCase() as Role : (user?.role || 'user'),
            permissions: Array.isArray((data as any).permissions) ? (data as any).permissions : [],
          } as any);
        }
      } catch {}
      setAuthPhase('auth');
      navigate('/home');
      return true;
    } catch (e: any) {
      const status = e?.status || e?.response?.status;
      if (status === 429) {
        try { console.warn('Troppe richieste: attendi qualche secondo e riprova.'); } catch {}
        return false;
      }
      try { console.warn('OTP non valido o scaduto.'); } catch {}
      try { sessionStorage.removeItem('lmw_mfa_token'); } catch {}
      setMfa({ required: false, token: null, email: null, tenantId: null });
      navigate('/login');
      return false;
    }
  };

  /** Check permesso (usa prima permissions BE, poi fallback ROLE_PERMISSIONS) */
  const has = (permission: Permission) => {
    if (!user) return false;
    // Se presenti permessi espliciti sull'utente, usali; altrimenti mappa per ruolo
    if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
    return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
  };

  const isAdmin = () => (user?.role === 'admin') || has('REPORT_CREATE' as Permission);

  const isAuthenticated = authPhase === 'auth';

  // Helper pubblico: true se in fase MFA
  const isMfaMode = () => authPhase === 'mfa' || mfa.required === true;

  const value = useMemo(
    () => ({ isAuthenticated, user, setUser, login, signup, logout, has, isAdmin, mfa, verifyOtp, authPhase, isMfaMode, ready }),
    [isAuthenticated, user, mfa, authPhase, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}









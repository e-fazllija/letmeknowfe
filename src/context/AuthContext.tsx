// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { v1, saveTenantId, refreshAccess, clearReportsLookupsCache } from "@/lib/api";
import { verifyOtpOnce } from "@/lib/tenantAuth.service";
import { useNavigate } from "react-router-dom";
import { loginTenantUser, signupTenantUser } from "@/lib/auth";

export type Role = "admin" | "agent" | "user" | "superhost";
export type Permission = "REPORTS_VIEW" | "REPORT_CREATE" | "REPORTS_MANAGE";

type User = { email: string; role: Role; permissions?: Permission[] };

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* --- Storage keys --- */
const STORAGE_KEY = "letmeknow_auth";
const EMAIL_KEY = "lmw_user_email";
const ROLE_KEY  = "lmw_user_role";
const TENANT_KEY = "lmw_client_id";
const TOKEN_KEY  = "lmw_token";

/* --- Permission map per ruolo (frontend) --- */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superhost: ["REPORTS_VIEW", "REPORT_CREATE", "REPORTS_MANAGE"],
  admin:     ["REPORTS_VIEW", "REPORT_CREATE", "REPORTS_MANAGE"],
  agent:     ["REPORTS_VIEW"],
  user:      ["REPORTS_VIEW", "REPORTS_MANAGE"],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mfa, setMfa] = useState<MfaState>({ required: false });
  const [authPhase, setAuthPhase] = useState<AuthPhase>('anon');
  const navigate = useNavigate();

  // Bootstrap live: usa esclusivamente /v1/tenant/auth/me (cookie-first)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(v1('tenant/auth/me'));
        const data: any = res?.data ?? null;
        if (data) {
          const roleNorm = data.role ? String(data.role).toLowerCase() as Role : undefined;
          const next: User = {
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
        }
      } catch (err) {
        try { console.warn('[auth] bootstrap /me FAIL', err); } catch {}
        setUser(null);
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
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("lmw_client_id");
      localStorage.removeItem("x-tenant-id");
      localStorage.removeItem("lmw_first_admin_granted");
      try { sessionStorage.removeItem('lmw_session'); } catch {}
      clearReportsLookupsCache();
    } catch {}
    emitGlobalLogout();
  }

  /** Bootstrap: inizializza tenant + user “light” se c’è già un token */
  useEffect(() => {
    try {
      // Seed tenant da env se assente
      const hasTenant = localStorage.getItem(TENANT_KEY);
      const envTenant = (import.meta as any)?.env?.VITE_DEV_TENANT_ID as string | undefined;
      if (import.meta.env.DEV && !hasTenant && envTenant && envTenant.trim()) {
        saveTenantId(envTenant.trim());
      }

      const token = localStorage.getItem("access_token");
      const email = localStorage.getItem(EMAIL_KEY) || "";
      const savedRole = (localStorage.getItem(ROLE_KEY) as Role | null) || "user";

      if (token) {
        // Se ho token, considero autenticato e creo utente light
        setUser({ email, role: savedRole });
        setAuthPhase('auth');
        return;
      }

      // fallback vecchia versione
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        if (parsed?.email && (parsed.role === "admin" || parsed.role === "user" || parsed.role === "superhost")) {
          setUser(parsed);
          localStorage.setItem(EMAIL_KEY, parsed.email);
          localStorage.setItem(ROLE_KEY, parsed.role);
        }
      }
    } catch {
      /* ignore */
    }
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

  // Refresh silenzioso: se non abbiamo token in memoria, prova a recuperarlo via cookie
  useEffect(() => {
    (async () => {
      try {
        const hasToken = !!localStorage.getItem("access_token");
        if (hasToken) return;
        // Guard: NON fare refresh su /login o in MFA
        try {
          const hash = typeof window !== 'undefined' ? window.location.hash : '';
          const path = typeof window !== 'undefined' ? window.location.pathname : '';
          const onLogin = (hash && hash.startsWith('#/login')) || path === '/login';
          const inMfa = ((): boolean => { try { return !!sessionStorage.getItem('lmw_mfa_token'); } catch { return false; } })();
          if (onLogin || inMfa) return;
        } catch { /* ignore */ }
        const newTok = await refreshAccess();
        if (!newTok) return;
        const email = localStorage.getItem(EMAIL_KEY) || "";
        const roleSaved = (localStorage.getItem(ROLE_KEY) as Role | null) || "user";
        setUser({ email, role: roleSaved });
        setAuthPhase('auth');
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Bootstrap profilo su mount: se sessione attiva ma user incompleto, carica /me
  useEffect(() => {
    try {
      // cookie-first: usiamo localStorage.lmw_session per segnalare una sessione FE attiva
      const hasSession = localStorage.getItem('lmw_session') === '1';
      const needsProfile = !user?.email || !user?.role;
      if (!hasSession || !needsProfile) return;
    } catch { return; }

    (async () => {
      try {
        const res = await api.get(v1('tenant/auth/me'), { withCredentials: true });
        const data: any = res?.data;
        if (data) {
          const roleNorm = data.role ? String(data.role).toLowerCase() as Role : null;
          setUser({
            email: data.email ?? (user?.email || null),
            role: (roleNorm as any) ?? (user?.role || null),
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
          } as any);
          setAuthPhase('auth');
          if (import.meta.env.DEV) console.info('[auth] bootstrap /me OK', { email: data.email, role: roleNorm });
        } else {
          console.warn('[auth] /me returned empty body — UI limitata');
        }
      } catch (e) {
        console.warn('[auth] /me bootstrap error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Reagisci a cambiamenti storage (token/email/role) – utile dopo MFA */
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem("access_token");
      const email = localStorage.getItem(EMAIL_KEY) || "";
      const roleSaved = (localStorage.getItem(ROLE_KEY) as Role | null) || "user";
      if (token) setUser({ email, role: roleSaved });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** LOGIN reale: usa il ruolo salvato da auth.ts (lmw_user_role) */
  const login = async (email: string, password: string, remember = true) => {
    if (!email || !password) throw new Error("Email e password obbligatorie");
    setAuthPhase('login');
    // Salva subito l'email per la label navbar
    try {
      const roleSaved = (localStorage.getItem(ROLE_KEY) as Role | null) || 'user';
      setUser((prev) => ({ email, role: (prev?.role || roleSaved) as Role, permissions: prev?.permissions }));
    } catch {}
    try {
      await loginTenantUser({ email, password }); // scrive EMAIL_KEY/TENANT_KEY e forse ROLE_KEY
    } catch (e: any) {
      const status = e?.status || e?.response?.status;
      if (status === 428 || e?.mfaRequired) {
        try {
          const mfaToken = ((): string | null => { try { return sessionStorage.getItem("lmw_mfa_token"); } catch { return null; } })();
          const tenantId = ((): string | null => { try { return localStorage.getItem("lmw_client_id"); } catch { return null; } })();
          setMfa({ required: true, token: mfaToken, email, tenantId });
          setAuthPhase('mfa');
        } catch {}
        return; // stop here, UI should handle MFA
      }
      throw e;
    }

    // Se non scatta MFA, a questo punto BE può aver già dato token (gestito nella pagina login).
    // Qui aggiorno lo stato utente in ogni caso.
    let role: Role = "user";
    try {
      const r = localStorage.getItem(ROLE_KEY) as Role | null;
      if (r === "admin" || r === "user" || r === "superhost") role = r;
    } catch {}

    const u: User = { email, role };
    setUser(u);
    // se l'access token è già presente (no MFA), siamo in fase auth
    try { if (localStorage.getItem("access_token")) setAuthPhase('auth'); } catch {}
    if (remember) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  /** SIGNUP reale (non fa auto-login) */
  const signup: AuthContextType["signup"] = async ({ clientId, email, password, role = "ADMIN" }) => {
    if (!clientId) throw new Error("clientId obbligatorio per signup");
    await signupTenantUser({ clientId, email, password, role });
  };

  /** LOGOUT: pulizia completa */
  const logout = async () => {
    try { await api.post(v1("tenant/auth/logout"), {}, { withCredentials: true }); } catch {}
    try { logoutSilently(); setAuthPhase('anon'); } finally { navigate("/login", { replace: true }); }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    if (!mfa.required || !mfa.token) throw new Error("MFA non inizializzato");
    const clean = String(code || '').replace(/\D/g, '');

    const res = await verifyOtpOnce(clean, mfa.token);

    if (res.status >= 200 && res.status < 300) {
      const accessToken = (res.data as any)?.access_token || (res.data as any)?.accessToken || null;
      if (accessToken) {
        try {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('lmw_token', accessToken);
        } catch {}
      }
      try { localStorage.setItem('lmw_session', '1'); } catch {}
      setMfa({ required: false, token: null, email: null, tenantId: null });
      // Recupera profilo reale dal BE (email/role/permissions); nessun fallback locale
      try {
        const meRes = await api.get(v1('tenant/auth/me'), { withCredentials: true });
        const data = meRes?.data ?? null;
        if (data) {
          setUser({
            email: (data as any).email ?? (mfa.email || ''),
            role: (data as any).role ? String((data as any).role).toLowerCase() as Role : (user?.role || 'user'),
            permissions: Array.isArray((data as any).permissions) ? (data as any).permissions : [],
          });
        } else {
          try { console.warn('[auth] /me returned empty body — UI limitata (nessun fallback admin)'); } catch {}
        }
      } catch (e) {
        try { console.warn('[auth] /me error — UI limitata (nessun fallback admin)', e); } catch {}
      }

      setAuthPhase('auth');
      navigate('/home');
      return true;
    }

    if (res.status === 401 || res.status === 403) {
      try { sessionStorage.removeItem('lmw_mfa_token'); } catch {}
      setMfa({ required: false, token: null, email: null, tenantId: null });
      try { console.warn('OTP scaduto o non valido, rifai l\’accesso.'); } catch {}
      navigate('/login');
      return false;
    }

    if (res.status === 429) {
      try { console.warn('Troppe richieste: attendi qualche secondo e riprova.'); } catch {}
      return false;
    }

    return false;
  };

  /** Check permesso (usa prima permissions BE, poi fallback ROLE_PERMISSIONS) */
  const has = (permission: Permission) => {
    if (!user) return false;
    // Se presenti permessi espliciti sull'utente, usali; altrimenti mappa per ruolo
    if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
    return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
  };

  const isAdmin = () => (user?.role === 'admin') || has('REPORT_CREATE' as Permission);

  const isAuthenticated = ((): boolean => {
    try {
      const access = !!localStorage.getItem('access_token');
      const session = localStorage.getItem('lmw_session') === '1';
      return access || session;
    } catch { return false; }
  })();

  // Helper pubblico: true se in fase MFA
  const isMfaMode = () => authPhase === 'mfa' || mfa.required === true;

  const value = useMemo(
    () => ({ isAuthenticated, user, setUser, login, signup, logout, has, isAdmin, mfa, verifyOtp, authPhase, isMfaMode }),
    [isAuthenticated, user, mfa, authPhase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}









// src/pages/Login.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo-transparent-light.png";
import { login as apiLogin, completeMfa as apiCompleteMfa } from "@/api/api";
import { mfaSetup, mfaVerify } from "@/lib/tenantAuth.service";
// import { refreshAccess } from "@/lib/api";

type LocationState = { redirectTo?: string } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as LocationState) || null;

  // Clean activation-related query params from /login to avoid refresh loops
  useEffect(() => {
    try {
      const qs = String(location.search || "");
      if (qs && /activate|selector|token/i.test(qs)) {
        const href = window.location.href;
        const parts = href.split('#');
        if (parts.length > 1) {
          const hashPath = parts[1].split('?')[0];
          window.history.replaceState({}, '', parts[0] + '#' + hashPath);
        } else {
          window.history.replaceState({}, '', location.pathname);
        }
      }
    } catch {}
  }, []);

  // Nessun tenant in login UI: header x-tenant-id viene iniettato in dev dal client API
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // MFA inline
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  // MFA setup inline
  const [setupStep, setSetupStep] = useState(false);
  const [setupToken, setSetupToken] = useState<string>("");
  // QR non utilizzato: mostriamo solo secret/otpauth
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [secretDev, setSecretDev] = useState<string | undefined>(undefined);
  const [expiresIn, setExpiresIn] = useState<number | undefined>(undefined);
  const [setupErr, setSetupErr] = useState<string | null>(null);
  const [setupOtp, setSetupOtp] = useState<string>("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | undefined>(undefined);
  // Rimosso campo Client ID (tenant)

  // Nessun redirect automatico a /mfa/complete: MFA gestito inline
  useEffect(() => {
    try { sessionStorage.removeItem("lmw_mfa_token"); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avvia setup MFA inline quando abbiamo un setupToken
  useEffect(() => {
    if (!setupStep || !setupToken) return;
    (async () => {
      try {
        setSetupErr(null);
        const info: any = await mfaSetup(setupToken);
        setOtpauthUrl(info?.otpauthUrl || "");
        setSecretDev(info?.secret || undefined);
        setExpiresIn(info?.expiresIn || undefined);
              } catch (e: any) {
        setSetupErr(e?.response?.data?.message || e?.message || "Impossibile iniziare il setup MFA.");
      }
    })();
  }, [setupStep, setupToken]);
  // Pulisce eventuale sessione/cookie obsoleti per evitare refresh su /login
  useEffect(() => {
    try {
      localStorage.removeItem("lmw_session");
      document.cookie = "refresh_token=; Max-Age=0; path=/;";
    } catch {}
  }, []);
  // Niente refresh su /login: evitiamo chiamate a /refresh da qui


  // Niente prefill tenant: gestito via proxy/header lato dev

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setMfaError(null);
    setMfaStep(false);
    setMfaToken("");
    try {
      const data: any = await apiLogin(email.trim(), password);
      // Nessun salvataggio tenant lato FE: header x-tenant-id solo in dev via env

      // Caso richiesta MFA nel body (200/201)
      try {
        if ((data as any)?.mfaRequired) {
          const token201 = (data as any)?.mfaToken || "";
          setMfaToken(token201);
          setMfaStep(true);
          return;
        }
      } catch {}

      // Caso MFA non segnalato via 428 ma via payload/header 2xx
      // Nessun salvataggio del token in storage; cookie-first

      // Setup MFA richiesto (prima configurazione) in risposta 2xx
      if ((data as any)?.requireMfaSetup === true && (data as any)?.setupToken) { const st = String((data as any).setupToken || ''); setSetupToken(st); setSetupStep(true); return; }

      // ? Success senza MFA
      if (!data?.mfaRequired) {
        const target = locState?.redirectTo || "/home";
        navigate(target, { replace: true });
        return;
      }

      // Fallback: risposta atipica
      setError("Risposta inattesa dal server.");
    } catch (err: any) {
  // Gestione SETUP MFA (428) inline
  if (err?.status === 428 || err?.response?.status === 428) {
    try {
      const body = (err as any).body || err?.response?.data || {};
      const st = String(body?.setupToken || body?.token || "");
      if (st) { setSetupToken(st); setSetupStep(true); return; }
    } catch {}
  }
  const message = err?.response?.data?.message || err?.message || "Login fallito";
  setError(message);
} finally {
  setLoading(false);
}  }  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="container">
        <div className="row justify-content-center">
          {/* Logo brand */}
          <div className="col-12 text-center mb-4">
            <img src={logo} alt="LetMeKnow" style={{ height: 160, width: "auto" }} className="mb-2" />
            <div className="text-muted">Whistleblowing platform</div>
          </div>

          {/* Card Login */}
          <div className="col-12 col-sm-10 col-md-7 col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="card-title mb-3">Accedi</h4>
                <p className="text-muted mb-4">Inserisci le credenziali per continuare.</p>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <form onSubmit={doLogin}>

                  <div className="mb-3">
                    {/* Tenant non richiesto in UI */}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="nome@azienda.it"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={4}
                    />
                  </div>

                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="remember"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="remember">
                      Ricordami su questo dispositivo
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? "Accesso in corso…" : "Accedi"}
                  </button>
                </form>

                {setupStep && (
                  <div className="mt-4">
                    <h5 className="mb-2">Configura MFA</h5>
                    {setupErr && <div className="alert alert-danger py-2" role="alert" aria-live="assertive">{setupErr}</div>}
                    {(secretDev || otpauthUrl) && (
                      <div className="mb-3">
                        {secretDev ? (
                          <div className="alert alert-secondary">
                            <div><strong>Segreto (dev):</strong> <code>{secretDev}</code></div>
                            <div className="mt-2">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigator.clipboard.writeText(secretDev || "")}>Copia</button>
                            </div>
                          </div>
                        ) : (
                          <div className="alert alert-info">
                            <div><strong>otpauthUrl:</strong> <code>{otpauthUrl}</code></div>
                            <div className="mt-2">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigator.clipboard.writeText(otpauthUrl || "")}>Copia</button>
                            </div>
                          </div>
                        )}
                        <div className="small text-muted">
                          Istruzioni: apri l'app OTP → aggiungi account → "Inserisci chiave" → incolla il secret.
                        </div>
                        {typeof expiresIn === 'number' && <div className="text-muted small mt-1">Scade tra ~{expiresIn}s</div>}
                      </div>
                    )}

                    {!recoveryCodes && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault(); setSetupErr(null);
                          const code = (setupOtp || '').replace(/\D/g, '');
                          if (code.length !== 6) { setSetupErr('Inserisci un codice a 6 cifre.'); return; }
                          try {
                            const res = await mfaVerify(setupToken, code);
                            const codes = (res?.recoveryCodes || []) as string[];
                            setRecoveryCodes(codes);
                          } catch (err: any) {
                            setSetupErr(err?.response?.data?.message || err?.message || 'Codice non valido.');
                          }
                        }}
                        noValidate
                      >
                        <div className="input-group mb-2">
                          <input
                            className="form-control"
                            placeholder="Codice a 6 cifre"
                            inputMode="numeric"
                            maxLength={6}
                            value={setupOtp}
                            onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ''))}
                            aria-label="Codice a 6 cifre"
                            required
                          />
                          <button className="btn btn-dark" type="submit">Verifica</button>
                        </div>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => { setSetupStep(false); setSetupToken(''); setRecoveryCodes(undefined); }}>Annulla</button>
                      </form>
                    )}

                    {recoveryCodes && (
                      <div className="card mt-3">
                        <div className="card-body">
                          <h6 className="card-title">Codici di recupero</h6>
                          <p className="text-muted small">Salvali in un luogo sicuro. Verranno mostrati solo ora.</p>
                          <pre style={{ whiteSpace: 'pre-wrap' }}>{recoveryCodes.join('\n')}</pre>
                          <div className="d-flex gap-2">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n'))}>Copia tutto</button>
                            <button type="button" className="btn btn-primary" onClick={() => { setSetupStep(false); setRecoveryCodes(undefined); setSetupToken(''); setSetupOtp(''); }}>Torna al login</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mfaStep && (
                  <div className="mt-4">
                    <h5 className="mb-2">Verifica 2FA</h5>
                    {mfaError && <div className="alert alert-danger py-2">{mfaError}</div>}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setMfaError(null);
                        if (mfaSubmitting) return;
                        const code = (otp || "").replace(/\D/g, "");
                        if (code.length !== 6) { setMfaError("Inserisci un codice a 6 cifre."); return; }
                        try {
                          setMfaSubmitting(true);
                          const out = await apiCompleteMfa(mfaToken, code);
                          // Cookie-first: nessun token salvato lato FE; se la chiamata è OK, procedi
                          setMfaStep(false); setMfaToken(""); setOtp(""); setMfaError(null);
                          navigate("/home", { replace: true });
                        } catch (err: any) {
                          const status = err?.status || err?.response?.status;
                          if (status === 401) setMfaError("Codice non valido.");
                          else if (status === 429) setMfaError("Troppe richieste. Riprova tra qualche secondo.");
                          else setMfaError(err?.response?.data?.message || err?.message || "Codice non valido o scaduto.");
                        } finally {
                          setMfaSubmitting(false);
                        }
                      }}
                      noValidate
                    >
                      <div className="input-group">
                        <input
                          className="form-control"
                          placeholder="Codice a 6 cifre"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          aria-label="Codice a 6 cifre"
                          required
                        />
                        <button type="submit" className="btn btn-dark" disabled={mfaSubmitting}>Verifica</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="mt-3 small text-muted">
                  <div>💡 Se non hai ancora un account, registrati dalla pagina pubblica.</div>
                </div>
                <div className="mt-2 small text-muted text-center">
                  {(() => {
                    const publicSignupUrl = (import.meta as any).env?.VITE_PUBLIC_SIGNUP_URL || `${(import.meta as any).env?.VITE_API_BASE_URL}/public`;
                    return (
                      <p className="mb-0">
                        Se non hai ancora un account,&nbsp;
                        <a href={publicSignupUrl}>registrati dalla pagina pubblica</a>.
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="text-center text-muted small mt-3">
              © {new Date().getFullYear()} LetMeKnow
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


























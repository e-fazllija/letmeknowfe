// src/pages/Login.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import logo from "@/assets/Logo_Letmeknow_Scuro.png";
import { completeMfa as apiCompleteMfa } from "@/api/api";
import { mfaSetup, mfaVerify } from "@/lib/tenantAuth.service";
import { useAuth } from "@/context/AuthContext";

type LocationState = { redirectTo?: string } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as LocationState) || null;
  const { login: ctxLogin, mfa: ctxMfa, authPhase } = useAuth();
  const publicSignupUrl = "https://let-me-know.it/public/signup";
    (import.meta as any).env?.VITE_PUBLIC_SIGNUP_URL ||
    `${(import.meta as any).env?.VITE_API_BASE_URL}/public`;

  // Clean activation-related query params from /login to avoid refresh loops
  useEffect(() => {
    try {
      const qs = String(location.search || "");
      if (qs && /activate|selector|token/i.test(qs)) {
        const href = window.location.href;
        const parts = href.split("#");
        if (parts.length > 1) {
          const hashPath = parts[1].split("?")[0];
          window.history.replaceState({}, "", parts[0] + "#" + hashPath);
        } else {
          window.history.replaceState({}, "", location.pathname);
        }
      }
    } catch {}
  }, [location.pathname, location.search]);

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

  // Nessun redirect automatico a /mfa/complete: MFA gestito inline
  useEffect(() => {
    try {
      sessionStorage.removeItem("lmw_mfa_token");
    } catch {}
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

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setMfaError(null);
    setMfaStep(false);
    setMfaToken("");
    try {
      await ctxLogin(email.trim(), password, remember);
      try {
        const needMfa = ctxMfa?.required === true || authPhase === "mfa";
        if (needMfa) {
          navigate("/mfa/code", { replace: true, state: locState || undefined });
          return;
        }
      } catch {}
    } catch (err: any) {
      if (err?.status === 428 || err?.response?.status === 428) {
        try {
          const body = (err as any).body || err?.response?.data || {};
          const st = String(body?.setupToken || body?.token || "");
          if (st) {
            setSetupToken(st);
            setSetupStep(true);
            return;
          }
        } catch {}
      }
      const message = err?.response?.data?.message || err?.message || "Login fallito";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-hero">
      <Container>
        <Row className="justify-content-center">
          <Col lg={10}>
            <Card className="auth-shell border-0">
              <Row className="g-0">
                <Col lg={5} className="d-none d-lg-flex flex-column justify-content-between auth-hero-pane">
                  <div>
                    <img src={logo} alt="LetMeKnow" className="auth-logo mb-4" />
                    <div className="label-muted mb-2">Accesso riservato</div>
                    <p className="mb-3">
                      Gestisci segnalazioni, audit trail e controlli MFA in un'unica console sicura.
                    </p>
                    <div className="auth-bullet">
                      <span aria-hidden="true" />
                      Dashboard e workflow guidati
                    </div>
                    <div className="auth-bullet">
                      <span aria-hidden="true" />
                      Accesso protetto con MFA
                    </div>
                    <div className="auth-bullet">
                      <span aria-hidden="true" />
                      Log e audit trail sempre disponibili
                    </div>
                  </div>
                  <div className="badge-soft mt-4">
                    <img src={logo} alt="Whistleblowing Platform" width={20} height={20} />
                    <span>Whistleblowing Platform</span>
                  </div>
                </Col>
                <Col lg={7} className="p-4 p-lg-5">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span className="badge-soft">Console</span>
                    <span className="label-muted">Login</span>
                  </div>
                  <h2 className="auth-card-title mb-1">Bentornato!</h2>
                  <p className="text-secondary mb-4">
                    Inserisci credenziali e completa l'autenticazione per accedere.
                  </p>

                  {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                  <Form onSubmit={doLogin} className="text-start">
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="nome@azienda.it"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="password">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={4}
                      />
                    </Form.Group>

                    <Form.Check
                      className="mb-3"
                      type="checkbox"
                      id="remember"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      label="Ricordami su questo dispositivo"
                    />

                    <div className="d-grid gap-2">
                      <Button type="submit" variant="dark" className="rounded-pill" disabled={loading}>
                        {loading ? "Accesso in corso..." : "Accedi"}
                      </Button>
                    </div>
                  </Form>

                  {setupStep && (
                    <div className="mt-4">
                      <h5 className="mb-2">Configura MFA</h5>
                      {setupErr && (
                        <Alert variant="danger" className="py-2" role="alert" aria-live="assertive">
                          {setupErr}
                        </Alert>
                      )}
                      {(secretDev || otpauthUrl) && (
                        <div className="mb-3">
                          {secretDev ? (
                            <Alert variant="secondary" className="mb-2">
                              <div><strong>Segreto (dev):</strong> <code>{secretDev}</code></div>
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => navigator.clipboard.writeText(secretDev || "")}
                                >
                                  Copia
                                </Button>
                              </div>
                            </Alert>
                          ) : (
                            <Alert variant="info" className="mb-2">
                              <div><strong>otpauthUrl:</strong> <code>{otpauthUrl}</code></div>
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => navigator.clipboard.writeText(otpauthUrl || "")}
                                >
                                  Copia
                                </Button>
                              </div>
                            </Alert>
                          )}
                          <div className="small text-muted">
                            Istruzioni: apri l'app OTP, aggiungi account, scegli "Inserisci chiave" e incolla il secret.
                          </div>
                          {typeof expiresIn === "number" && (
                            <div className="text-muted small mt-1">Scade tra ~{expiresIn}s</div>
                          )}
                        </div>
                      )}

                      {!recoveryCodes && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setSetupErr(null);
                            const code = (setupOtp || "").replace(/\D/g, "");
                            if (code.length !== 6) { setSetupErr("Inserisci un codice a 6 cifre."); return; }
                            try {
                              const res = await mfaVerify(setupToken, code);
                              const codes = (res?.recoveryCodes || []) as string[];
                              setRecoveryCodes(codes);
                            } catch (err: any) {
                              setSetupErr(err?.response?.data?.message || err?.message || "Codice non valido.");
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
                              onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ""))}
                              aria-label="Codice a 6 cifre"
                              required
                            />
                            <button className="btn btn-dark" type="submit">Verifica</button>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => { setSetupStep(false); setSetupToken(""); setRecoveryCodes(undefined); }}
                          >
                            Annulla
                          </button>
                        </form>
                      )}

                      {recoveryCodes && (
                        <Card className="mt-3">
                          <Card.Body>
                            <Card.Title className="h6">Codici di recupero</Card.Title>
                            <p className="text-muted small">Salvali in un luogo sicuro. Verranno mostrati solo ora.</p>
                            <pre style={{ whiteSpace: "pre-wrap" }}>{recoveryCodes.join("\n")}</pre>
                            <div className="d-flex gap-2">
                              <Button
                                type="button"
                                variant="outline-secondary"
                                onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}
                              >
                                Copia tutto
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => {
                                  setSetupStep(false);
                                  setRecoveryCodes(undefined);
                                  setSetupToken("");
                                  setSetupOtp("");
                                }}
                              >
                                Torna al login
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      )}
                    </div>
                  )}

                  {mfaStep && (
                    <div className="mt-4">
                      <h5 className="mb-2">Verifica 2FA</h5>
                      {mfaError && <Alert variant="danger" className="py-2">{mfaError}</Alert>}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setMfaError(null);
                          if (mfaSubmitting) return;
                          const code = (otp || "").replace(/\D/g, "");
                          if (code.length !== 6) { setMfaError("Inserisci un codice a 6 cifre."); return; }
                          try {
                            setMfaSubmitting(true);
                            await apiCompleteMfa(mfaToken, code);
                            setMfaStep(false);
                            setMfaToken("");
                            setOtp("");
                            setMfaError(null);
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

                  <div className="mt-3 small text-muted text-center">
                    <p className="mb-1">Non hai ancora un account?</p>
                    <a href={publicSignupUrl}>Registrati dalla pagina pubblica</a>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

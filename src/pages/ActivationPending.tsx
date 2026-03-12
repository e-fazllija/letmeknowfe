import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import logo from "@/assets/Logo_Letmeknow_Scritta_Sotto_Scuro.png";
import {
  changeOwnerEmail,
  resendOwnerInvite,
} from "@/lib/publicAuth.service";

type LocationState = { activationUrl?: string; email?: string; clientId?: string } | null;

function parseActivation(url?: string) {
  try {
    const u = new URL(url || "");
    return {
      selector: u.searchParams.get("selector") || "",
      token: u.searchParams.get("token") || "",
    };
  } catch {
    return { selector: "", token: "" };
  }
}

export default function ActivationPending() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || null;

  const fallbackUrl = useMemo(() => {
    try {
      return sessionStorage.getItem("lmw_last_activation_url") || undefined;
    } catch {
      return undefined;
    }
  }, []);
  const fallbackEmail = useMemo(() => {
    try {
      return sessionStorage.getItem("lmw_last_activation_email") || undefined;
    } catch {
      return undefined;
    }
  }, []);

  const activationUrl = state?.activationUrl || fallbackUrl;
  const email = state?.email || fallbackEmail;
  const fallbackClientId = useMemo(() => {
    try {
      return (
        sessionStorage.getItem("lmw_last_client_id") ||
        localStorage.getItem("lmw_client_id") ||
        localStorage.getItem("lmw_tenant_id") ||
        undefined
      );
    } catch {
      return undefined;
    }
  }, []);
  const clientId = state?.clientId || fallbackClientId;
  const parsed = useMemo(() => parseActivation(activationUrl), [activationUrl]);
  const exposeActivationUrls =
    String(
      ((import.meta as any).env?.VITE_EXPOSE_ACTIVATION_URLS ??
        (import.meta as any).env?.EXPOSE_ACTIVATION_URLS ??
        "") as string,
    )
      .toLowerCase()
      .trim() === "true";
  const showActivationDebug = !!(
    activationUrl &&
    exposeActivationUrls &&
    (import.meta as any).env?.DEV
  );

  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>(email || "");
  const [resendLoading, setResendLoading] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

  // Log immediato al mount se ci sono selector/token
  useEffect(() => {
    if (!activationUrl) return;
    console.log("[Activation] selector/token disponibili (mount):", parsed);
  }, [activationUrl, parsed]);

  useEffect(() => {
    if (email && !emailInput) setEmailInput(email);
  }, [email, emailInput]);

  function mapError(e: any): string {
    const status = e?.status || e?.response?.status;
    const message = e?.data?.message || e?.response?.data?.message || e?.message;
    if (status === 404) {
      return "Non ho trovato un owner in attesa per questa azienda. Ripeti la registrazione o contatta il supporto.";
    }
    if (status === 409) {
      return "Questa email risulta gia associata al tenant. Inserisci un altro indirizzo.";
    }
    return message || "Impossibile completare la richiesta. Riprova piu tardi.";
  }

  async function resendMail() {
    setResendMsg(null);
    setResendErr(null);
    if (!clientId) {
      setResendErr("Non ho il riferimento azienda (clientId). Ripeti la registrazione.");
      return;
    }
    setResendLoading(true);
    try {
      await resendOwnerInvite({ clientId, email: emailInput.trim() || undefined });
      setResendMsg("Nuovo invito inviato. Controlla la casella di posta.");
    } catch (e: any) {
      setResendErr(mapError(e));
    } finally {
      setResendLoading(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setResendMsg(null);
    setResendErr(null);
    const next = emailInput.trim();
    if (!next || !/\S+@\S+\.\S+/.test(next)) {
      setResendErr("Inserisci un indirizzo email valido.");
      return;
    }
    if (!clientId) {
      setResendErr("Non ho il riferimento azienda (clientId). Ripeti la registrazione.");
      return;
    }
    setChangingEmail(true);
    try {
      await changeOwnerEmail({ clientId, newEmail: next });
      try {
        sessionStorage.setItem("lmw_last_activation_email", next);
      } catch {
        /* ignore */
      }
      setEmailInput(next);
      setResendMsg("Email aggiornata. Ti abbiamo inviato un nuovo link di attivazione.");
    } catch (err: any) {
      setResendErr(mapError(err));
    } finally {
      setChangingEmail(false);
    }
  }

  return (
    <div className="page-shell">
      <Container>
        <div className="page-hero mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Attivazione account</div>
              <h3 className="fw-bold mb-1">Conferma la tua email</h3>
              <p className="text-secondary mb-0">
                Abbiamo inviato il link di attivazione
                {emailInput || email ? ` a ${emailInput || email}` : ""}. Apri la mail e segui il link per completare l&apos;attivazione.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="metric-pill">
                <span className="text-success">*</span>
                <span>Stato</span>
                <strong>In attesa</strong>
              </div>
              <div className="metric-pill">
                <img src={logo} alt="LetMeKnow" width={16} height={16} />
                <span>Owner</span>
                <strong>Invitato</strong>
              </div>
              <span className="badge-soft">Controlla spam e newsletter</span>
            </div>
          </div>
        </div>

        <Row className="g-3">
          <Col lg={8}>
            <Card className="info-card h-100">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge-soft">Step</span>
                  <span className="label-muted">Verifica email</span>
                </div>

                <p className="text-secondary">
                  Se non trovi la mail, controlla lo spam. Puoi correggere l&apos;indirizzo oppure richiedere un nuovo invio.
                </p>

                {resendMsg && <Alert variant="success" className="py-2">{resendMsg}</Alert>}
                {resendErr && <Alert variant="danger" className="py-2">{resendErr}</Alert>}

                <div className="mb-3 p-3 rounded border bg-white">
                  <div className="fw-semibold small mb-2">Correggi l&apos;indirizzo email</div>
                  <Form className="d-flex flex-column flex-md-row gap-2" onSubmit={saveEmail} noValidate>
                    <Form.Control
                      type="email"
                      placeholder="es. owner@azienda.it"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                      style={{ maxWidth: 360 }}
                    />
                    <Button variant="outline-secondary" type="submit" disabled={changingEmail || resendLoading}>
                      {changingEmail ? "Aggiornamento..." : "Aggiorna email"}
                    </Button>
                  </Form>
                  <div className="text-muted small mt-2">
                    Se l&apos;indirizzo era errato, lo aggiorniamo e inviamo un nuovo link.
                  </div>
                </div>

                {clientId ? (
                  <div className="d-flex gap-2 flex-wrap align-items-center">
                    <Button variant="dark" className="rounded-pill" onClick={resendMail} disabled={resendLoading || changingEmail}>
                      {resendLoading ? "Invio in corso..." : "Reinvia mail"}
                    </Button>
                    <div className="text-muted small">
                      Usiamo il clientId salvato al termine della registrazione.
                    </div>
                  </div>
                ) : (
                  <div className="text-muted small">
                    Non ho potuto recuperare i dati della registrazione (clientId mancante). Ripeti il signup per richiedere un nuovo invito.
                  </div>
                )}

                {showActivationDebug && (
                  <div className="mt-3 p-3 rounded border">
                    <div className="fw-semibold small mb-2">Link di attivazione (dev)</div>
                    <a className="btn btn-sm btn-outline-primary" href={activationUrl} target="_blank" rel="noreferrer">
                      Apri attivazione
                    </a>
                  </div>
                )}

                <div className="d-flex gap-2 mt-4">
                  <Button variant="outline-dark" className="rounded-pill" onClick={() => navigate("/login")}>
                    Torna al login
                  </Button>
                  <Button variant="outline-secondary" className="rounded-pill" onClick={() => navigate("/register")}>
                    Torna alla registrazione
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="info-card h-100">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <img src={logo} alt="LetMeKnow" height={40} />
                  <span className="label-muted">Istruzioni</span>
                </div>
                <ul className="text-secondary small mb-3" style={{ paddingLeft: 18 }}>
                  <li>Apri la mail di attivazione e clicca sul link.</li>
                  <li>Se non la trovi, controlla spam e newsletter.</li>
                  <li>Dal link potrai impostare password e MFA.</li>
                </ul>
                <div className="badge-soft d-inline-flex align-items-center gap-2">
                  <img src={logo} alt="LetMeKnow" width={18} height={18} />
                  <span>Attivazione sicura</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

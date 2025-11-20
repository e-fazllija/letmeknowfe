import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

type LocationState = { activationUrl?: string; email?: string } | null;

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

  const gradientBg = "linear-gradient(135deg, #f5f7fb 0%, #eef2ff 50%, #f8fafc 100%)";

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
  const parsed = useMemo(() => parseActivation(activationUrl), [activationUrl]);

  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>(email || "");

  // Log immediato al mount se ci sono selector/token
  useEffect(() => {
    if (!activationUrl) return;
    console.log("[Activation] selector/token disponibili (mount):", parsed);
  }, [activationUrl, parsed]);

  useEffect(() => {
    if (email && !emailInput) setEmailInput(email);
  }, [email, emailInput]);

  function resendMail() {
    setResendMsg(null);
    setResendErr(null);
    if (!activationUrl) {
      setResendErr("Link di attivazione non disponibile. Ripeti la registrazione.");
      console.error("[Activation] Nessun activationUrl per reinvio simulato.");
      return;
    }
    console.log("[Activation] Reinvia simulato - selector/token:", parsed);
    setResendMsg("Reinvio simulato. Selector/token stampati in console.");
  }

  function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    const next = emailInput.trim();
    if (!next) {
      setResendErr("Inserisci un indirizzo email valido.");
      return;
    }
    try {
      sessionStorage.setItem("lmw_last_activation_email", next);
    } catch {
      /* ignore */
    }
    setResendMsg(`Email aggiornata a ${next}.`);
    setResendErr(null);
  }

  return (
    <div
      className="d-flex justify-content-center px-3"
      style={{ background: gradientBg, minHeight: "100vh", paddingTop: "8px", paddingBottom: "16px" }}
    >
      <div style={{ maxWidth: 640, width: "100%" }}>
        <Card className="shadow-sm border-0 rounded-4">
          <Card.Body className="p-4 p-md-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 44, height: 44, background: "#0d6efd1a", color: "#0d6efd", fontWeight: 700 }}
              >
                @
              </div>
              <div>
                <h3 className="mb-0">Conferma la tua email</h3>
                <div className="text-muted small">Attiva il profilo dall'email che ti abbiamo inviato.</div>
              </div>
            </div>

            <p className="text-muted">
              Abbiamo inviato il link di attivazione{(emailInput || email) ? ` a ${emailInput || email}` : ""}. Apri la mail e segui il link
              per completare l'attivazione del profilo.
            </p>

            <Alert variant="info" className="mb-4">
              <div className="fw-semibold mb-1">Non hai ricevuto la mail?</div>
              <div className="small mb-2">
                Controlla lo spam. Per i test puoi usare "Reinvia mail": stampa subito selector/token in console.
              </div>
              <div className="mb-3 p-3 rounded bg-white shadow-sm">
                <div className="fw-semibold small mb-2">Correggi l'indirizzo email</div>
                <form className="d-flex flex-column flex-md-row gap-2" onSubmit={saveEmail} noValidate>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="es. owner@azienda.it"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    style={{ maxWidth: 360 }}
                  />
                  <Button variant="outline-secondary" type="submit">
                    Salva
                  </Button>
                </form>
                <div className="text-muted small mt-2">
                  Se l'indirizzo era errato, aggiorna qui e richiedi un nuovo invio.
                </div>
              </div>
              {activationUrl ? (
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  <Button variant="primary" onClick={resendMail}>
                    Reinvia mail
                  </Button>
                </div>
              ) : (
                <div className="text-muted small">
                  Non ho potuto recuperare il link di attivazione. Ripeti la registrazione o richiedi un nuovo invito.
                </div>
              )}
              {resendMsg && <div className="text-success small mt-2 mb-0">{resendMsg}</div>}
              {resendErr && <div className="text-danger small mt-2 mb-0">{resendErr}</div>}
            </Alert>

            <div className="d-flex gap-2">
              <Button variant="dark" onClick={() => navigate("/login")}>
                Torna al login
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

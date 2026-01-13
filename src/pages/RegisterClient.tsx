import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import logo from "@/assets/Logo_Letmeknow_Scuro.png";
import {
  signupPublicClient,
  type EmployeeRange,
  type ContractTerm,
  type InstallmentPlan,
  type SignupPublicClientReq,
} from "@/lib/publicClients.service";

const EMPLOYEE_RANGE: EmployeeRange[] = [
  "DA_0_A_50",
  "DA_51_A_100",
  "DA_101_A_150",
  "DA_151_A_200",
  "DA_201_A_250",
  "OLTRE_250",
];
const EMPLOYEE_LABEL: Record<EmployeeRange, string> = {
  DA_0_A_50: "0 - 50",
  DA_51_A_100: "51 - 100",
  DA_101_A_150: "101 - 150",
  DA_151_A_200: "151 - 200",
  DA_201_A_250: "201 - 250",
  OLTRE_250: "Oltre 250",
};

type FormState = {
  companyName: string;
  contactEmail: string;
  employeeRange: EmployeeRange;
  billingTaxId: string;
  billingEmail: string;
  billingPec: string;
  billingSdiCode: string;
  billingAddressLine1: string;
  billingZip: string;
  billingCity: string;
  billingProvince: string;
  billingCountry: string;
  amount: string;
  currency: string;
  contractTerm: ContractTerm;
  installmentPlan: InstallmentPlan;
};

function makeIdem() {
  try {
    // @ts-ignore
    return crypto?.randomUUID
      ? // @ts-ignore
        `req-${crypto.randomUUID()}`
      : `req-${Math.random().toString(36).slice(2)}${Date.now()}`;
  } catch {
    return `req-${Date.now()}`;
  }
}

function logActivationDebug(url?: string) {
  if (!url) return;
  try {
    const u = new URL(url);
    const selector = u.searchParams.get("selector") || "";
    const token = u.searchParams.get("token") || "";
    console.log("[Activation] selector/token ricevuti:", { selector, token });
  } catch {
    console.log("[Activation] activationUrl (parse fallita):", url);
  }
}

export default function RegisterClient() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    companyName: "",
    contactEmail: "",
    employeeRange: "DA_0_A_50",
    billingTaxId: "",
    billingEmail: "",
    billingPec: "",
    billingSdiCode: "",
    billingAddressLine1: "",
    billingZip: "",
    billingCity: "",
    billingProvince: "",
    billingCountry: "Italia",
    amount: "1",
    currency: "EUR",
    contractTerm: "ONE_YEAR",
    installmentPlan: "ONE_SHOT",
  });

  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const INLINE = import.meta.env.VITE_REGISTER_INLINE_ACTIVATION === "true";
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPassword2, setOwnerPassword2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOkMsg(null);
    setErrMsg(null);
    setActivationUrl(null);

    if (!form.companyName.trim()) {
      setLoading(false);
      setErrMsg("Ragione sociale obbligatoria");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.contactEmail)) {
      setLoading(false);
      setErrMsg("Email contatto non valida");
      return;
    }
    if (
      form.billingTaxId.trim().length < 8 ||
      form.billingTaxId.trim().length > 28
    ) {
      setLoading(false);
      setErrMsg("P.IVA/CF deve essere tra 8 e 28 caratteri.");
      return;
    }
    if (!/^\d{5}$/.test(form.billingZip)) {
      setLoading(false);
      setErrMsg("CAP non valido (5 cifre)");
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(form.billingProvince)) {
      setLoading(false);
      setErrMsg("Provincia 2 lettere (es. RM)");
      return;
    }
    if (
      form.billingSdiCode &&
      !/^[A-Z0-9]{7}$/i.test(form.billingSdiCode.trim())
    ) {
      setLoading(false);
      setErrMsg("Codice SDI non valido (7 caratteri alfanumerici)");
      return;
    }

    // Validazione minima password owner (opzionale)
    setFormError(null);
    if (ownerPassword) {
      if (ownerPassword.length < 8) {
        setLoading(false);
        setFormError("La password deve avere almeno 8 caratteri.");
        return;
      }
      if (ownerPassword !== ownerPassword2) {
        setLoading(false);
        setFormError("Le password non coincidono.");
        return;
      }
    }

    try {
      const payload: SignupPublicClientReq = {
        client: {
          companyName: form.companyName.trim(),
          contactEmail: form.contactEmail.trim(),
          employeeRange: form.employeeRange,
          status: "ACTIVE",
          billing: {
            billingTaxId: form.billingTaxId.trim(),
            billingEmail: form.billingEmail.trim(),
            billingPec: form.billingPec.trim() || undefined,
            billingSdiCode: form.billingSdiCode.trim() || undefined,
            billingAddressLine1: form.billingAddressLine1.trim(),
            billingZip: form.billingZip.trim(),
            billingCity: form.billingCity.trim(),
            billingProvince: form.billingProvince
              .trim()
              .toUpperCase(),
            billingCountry: form.billingCountry.trim(),
          },
        },
        subscription: {
          amount: parseFloat(form.amount.replace(",", ".")),
          currency: form.currency || "EUR",
          contractTerm: form.contractTerm,
          installmentPlan: form.installmentPlan,
          status: "ACTIVE",
        },
        options: { idempotencyKey: makeIdem() },
      };

      // Inclusione condizionata nel payload
      if (INLINE && ownerPassword) {
        (payload as any).ownerPassword = ownerPassword;
      }

      const res = await signupPublicClient(payload);
      const actUrl = (res as any)?.ownerInvite
        ?.activationUrl as string | undefined;
      const inviteEmail =
        (res as any)?.ownerInvite?.email ||
        form.contactEmail.trim();
      const clientId =
        (res as any)?.clientId ||
        (res as any)?.client?.id;

      logActivationDebug(actUrl);

      if (actUrl) {
        setActivationUrl(actUrl);
      }
      try {
        if (actUrl) {
          sessionStorage.setItem("lmw_last_activation_url", actUrl);
        }
        sessionStorage.setItem("lmw_last_activation_email", inviteEmail);
        if (clientId) {
          sessionStorage.setItem(
            "lmw_last_client_id",
            String(clientId),
          );
        }
      } catch {
        // ignore
      }
      try {
        localStorage.setItem("lmw_after_signup_payment", "1");
        localStorage.setItem("lmw_autocheckout", "1");
      } catch {
        // ignore
      }
      navigate("/activation-pending", {
        replace: true,
        state: {
          activationUrl: actUrl,
          email: inviteEmail,
          clientId,
        },
      });
      return;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        setErrMsg("Esiste gia un account aziendale con questi dati.");
      } else {
        setErrMsg(
          e?.response?.data?.message ||
            e?.message ||
            "Errore durante la registrazione",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Container>
        <div className="page-hero page-hero--primary mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Onboarding</div>
              <h3 className="fw-bold mb-1">Registrazione Cliente</h3>
              <p className="text-secondary mb-0">
                Compila i dati aziendali e di fatturazione: l&apos;owner ricevera il link di attivazione.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="metric-pill">
                <span className="text-success">*</span>
                <span>Passo</span>
                <strong>1</strong>
              </div>
              <div className="metric-pill">
                <span className="text-primary">*</span>
                <span>Checkout</span>
                <strong>Stripe</strong>
              </div>
              <span className="badge-soft">MFA pronto all&apos;uso</span>
            </div>
          </div>
        </div>

        <Row className="g-3">
          <Col lg={4}>
            <Card className="info-card h-100">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <img src={logo} alt="LetMeKnow" height={42} />
                  <span className="label-muted">Guida rapida</span>
                </div>
                <p className="text-secondary small mb-3">
                  Inserisci i dati aziendali, fatturazione e l&apos;email dell&apos;owner. Il pagamento tramite Stripe avverrà dopo l&apos;accesso e l&apos;attivazione.
                </p>
                <ul className="text-secondary small mb-3">
                  <li>Validazione P.IVA/CF, CAP e SDI</li>
                  <li>Password owner inline (se abilitata)</li>
                  <li>Attivazione e MFA gestiti dal portale</li>
                </ul>
                <div className="badge-soft d-inline-flex align-items-center gap-2">
                  <img src={logo} alt="LetMeKnow" width={18} height={18} />
                  <span>LetMeKnow Platform</span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="info-card">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge-soft">Step</span>
                  <span className="label-muted">Dati cliente</span>
                </div>

                {okMsg && (
                  <Alert
                    variant="success"
                    className="mb-3"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {okMsg}
                  </Alert>
                )}
                {activationUrl && (
                  <div className="alert alert-info d-flex justify-content-between align-items-center">
                    <div>Link di attivazione disponibile (dev).</div>
                    <a
                      className="btn btn-sm btn-primary"
                      href={activationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apri attivazione
                    </a>
                  </div>
                )}
                {errMsg && (
                  <Alert
                    variant="danger"
                    className="mb-3"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {errMsg}
                  </Alert>
                )}

                <Form onSubmit={onSubmit} noValidate>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Ragione sociale *</Form.Label>
                        <Form.Control
                          value={form.companyName}
                          onChange={(e) => set("companyName", e.target.value)}
                          placeholder="Acme S.p.A."
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email contatto (owner) *</Form.Label>
                        <Form.Control
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) => set("contactEmail", e.target.value)}
                          placeholder="owner@acme.it"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Password owner (solo UI; payload condizionato da INLINE) */}
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="form-label">
                          Password owner{" "}
                          {INLINE
                            ? "(richiesta per attivazione inline)"
                            : "(verra ignorata dal payload)"}
                        </label>
                        <div className="input-group">
                          <input
                            type={showPwd ? "text" : "password"}
                            className="form-control"
                            placeholder="Min 8 caratteri"
                            value={ownerPassword}
                            onChange={(e) =>
                              setOwnerPassword(e.target.value)
                            }
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowPwd((s) => !s)}
                            aria-label="Mostra/Nascondi password"
                          >
                            {showPwd ? "Nascondi" : "Mostra"}
                          </button>
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="form-label">
                          Conferma password
                        </label>
                        <div className="input-group">
                          <input
                            type={showPwd2 ? "text" : "password"}
                            className="form-control"
                            placeholder="Ripeti la password"
                            value={ownerPassword2}
                            onChange={(e) =>
                              setOwnerPassword2(e.target.value)
                            }
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowPwd2((s) => !s)}
                            aria-label="Mostra/Nascondi conferma"
                          >
                            {showPwd2 ? "Nascondi" : "Mostra"}
                          </button>
                        </div>
                        {formError && (
                          <div className="form-text text-danger">
                            {formError}
                          </div>
                        )}
                      </div>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Numero dipendenti *</Form.Label>
                  <Form.Select
                    value={form.employeeRange}
                    onChange={(e) =>
                      set("employeeRange", e.target.value as EmployeeRange)
                    }
                  >
                    {EMPLOYEE_RANGE.map((opt) => (
                      <option key={opt} value={opt}>
                        {EMPLOYEE_LABEL[opt] || opt}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

                  <hr />
                  <h5 className="mt-2">Dati di fatturazione</h5>
                  <Row className="mt-1">
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>P.IVA / CF *</Form.Label>
                        <Form.Control
                          value={form.billingTaxId}
                          onChange={(e) =>
                            set("billingTaxId", e.target.value)
                          }
                          placeholder="12345678901"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email fatturazione *</Form.Label>
                        <Form.Control
                          type="email"
                          value={form.billingEmail}
                          onChange={(e) =>
                            set("billingEmail", e.target.value)
                          }
                          placeholder="fatture@acme.it"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>PEC</Form.Label>
                        <Form.Control
                          value={form.billingPec}
                          onChange={(e) =>
                            set("billingPec", e.target.value)
                          }
                          placeholder="pec@pec.it"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Codice SDI (7)</Form.Label>
                        <Form.Control
                          value={form.billingSdiCode}
                          onChange={(e) =>
                            set(
                              "billingSdiCode",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="AAAAAAA"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Indirizzo *</Form.Label>
                        <Form.Control
                          value={form.billingAddressLine1}
                          onChange={(e) =>
                            set("billingAddressLine1", e.target.value)
                          }
                          placeholder="Via Roma 1"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>CAP *</Form.Label>
                        <Form.Control
                          value={form.billingZip}
                          onChange={(e) =>
                            set("billingZip", e.target.value)
                          }
                          placeholder="00100"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={5}>
                      <Form.Group className="mb-3">
                        <Form.Label>Citta *</Form.Label>
                        <Form.Control
                          value={form.billingCity}
                          onChange={(e) =>
                            set("billingCity", e.target.value)
                          }
                          placeholder="Roma"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prov *</Form.Label>
                        <Form.Control
                          value={form.billingProvince}
                          onChange={(e) =>
                            set(
                              "billingProvince",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="RM"
                          maxLength={2}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nazione *</Form.Label>
                        <Form.Control
                          value={form.billingCountry}
                          onChange={(e) =>
                            set("billingCountry", e.target.value)
                          }
                          placeholder="Italia"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2">
                    <Button
                      type="submit"
                      variant="warning"
                      className="rounded-pill"
                      disabled={loading}
                    >
                      {loading ? "Invio..." : "Registra azienda"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => window.location.reload()}
                      disabled={loading}
                    >
                      Annulla
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

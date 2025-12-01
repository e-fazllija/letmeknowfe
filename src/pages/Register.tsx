// src/pages/Register.tsx
import { useState } from "react";
import type { FormEvent } from "react";

import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import {
  signupPublicClient,
  type EmployeeRange,
  type ContractTerm,
  type InstallmentPlan,
  type SignupPublicClientReq,
} from "@/lib/publicClients.service";
// import { activateAccount } from "@/lib/publicAuth.service";

/* -------------------- costanti UI -------------------- */
const EMPLOYEE_RANGE: EmployeeRange[] = [
  "DA_0_A_50",
  "DA_51_A_100",
  "DA_101_A_150",
  "DA_151_A_200",
  "DA_201_A_250",
  "OLTRE_250",
];
const CONTRACT_TERM: ContractTerm[] = ["ONE_YEAR", "THREE_YEARS"];

/* -------------------- tipi -------------------- */
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

  // credenziali owner
  password: string;
  passwordConfirm: string;
};

/* -------------------- helpers -------------------- */
// function parseActivationParams(urlStr?: string): { selector?: string; token?: string } {
//   try {
//     if (!urlStr) return {};
//     const u = new URL(urlStr);
//     const sp = u.searchParams;
//     const selector = sp.get("selector") || undefined;
//     const token = sp.get("token") || undefined;
//     return { selector, token };
//   } catch { return {}; }
// }

export default function Register() {
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
    amount: "99.90",
    currency: "EUR",
    contractTerm: "ONE_YEAR",
    installmentPlan: "ONE_SHOT",
    password: "",
    passwordConfirm: "",
  });

  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  // const [pwdErr, setPwdErr] = useState<string | null>(null);
  // const [confirmErr, setConfirmErr] = useState<string | null>(null);
  // const [activationUrl, setActivationUrl] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOkMsg(null);
    setErrMsg(null);

    // validazioni minime
    if (!form.companyName.trim()) {
      setLoading(false);
      return setErrMsg("Ragione sociale obbligatoria");
    }
    if (!/\S+@\S+\.\S+/.test(form.contactEmail)) {
      setLoading(false);
      return setErrMsg("Email contatto non valida");
    }
    if (!/^\d{5}$/.test(form.billingZip)) {
      setLoading(false);
      return setErrMsg("CAP non valido (5 cifre)");
    }
    if (!/^[A-Za-z]{2}$/.test(form.billingProvince)) {
      setLoading(false);
      return setErrMsg("Provincia 2 lettere (es. RM)");
    }
    // Validazioni password (opzionali): non bloccano il signup
    // setPwdErr(null);
    // setConfirmErr(null);
    // if (form.password && form.password.length < 8) setPwdErr("La password deve avere almeno 8 caratteri.");
    // if (form.password && form.password !== form.passwordConfirm) setConfirmErr("Le password non coincidono.");

    try {
      // 1) Signup PUBLIC client + subscription
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
      billingProvince: form.billingProvince.trim().toUpperCase(),
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
  options: { idempotencyKey: (crypto as any)?.randomUUID ? `req-${(crypto as any).randomUUID()}` : `req-${Math.random().toString(36).slice(2)}${Date.now()}` },
};
await signupPublicClient(payload);

      // 2) Salviamo password+email per l'attivazione (verrà letta da /activate)
      

      // 3) Messaggio finale (senza ID)
      setOkMsg(
        `In attesa di verifica della mail.\n\n` +
          `Abbiamo inviato un link di attivazione all’indirizzo: ${form.contactEmail}.\n` +
          `Apri la mail e segui il link: l’app completerà l’attivazione usando la password che hai impostato ora.\n` +
          `Dopo l’attivazione, al primo accesso ti verrà richiesto un codice di verifica a 6 cifre (OTP) inviato via email.`
      );
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "";

      // 409 → registrazione già avviata/non completata
      if (status === 409) {
        
        setOkMsg(
          `Registrazione già avviata.\n` +
            `Abbiamo inviato (o reinviato) il link di attivazione a ${form.contactEmail}.\n` +
            `Quando aprirai il link, useremo la password inserita qui per completare l’attivazione.`
        );
      } else {
        setErrMsg(String(msg || "Errore durante la registrazione"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <h1 className="mb-3">Registrazione Cliente</h1>
      <p className="text-muted">
        Compila i dati dell’azienda e imposta la password dell’owner. Riceverai
        una mail con il link di attivazione; al primo accesso ti verrà chiesto
        un codice OTP a 6 cifre inviato via email.
      </p>

      <Card className="shadow-sm">
        <Card.Body>
          {okMsg && (
            <Alert
              variant="success"
              className="mb-3"
              style={{ whiteSpace: "pre-line" }}
            >
              {okMsg}
            </Alert>
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
            {/* Dati azienda */}
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
                        {opt}
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
                    onChange={(e) => set("billingTaxId", e.target.value)}
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
                    onChange={(e) => set("billingEmail", e.target.value)}
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
                    onChange={(e) => set("billingPec", e.target.value)}
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
                      set("billingSdiCode", e.target.value.toUpperCase())
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
                    onChange={(e) => set("billingZip", e.target.value)}
                    placeholder="00100"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Città *</Form.Label>
                  <Form.Control
                    value={form.billingCity}
                    onChange={(e) => set("billingCity", e.target.value)}
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
                      set("billingProvince", e.target.value.toUpperCase())
                    }
                    placeholder="RM"
                    required
                    maxLength={2}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Nazione *</Form.Label>
                  <Form.Control
                    value={form.billingCountry}
                    onChange={(e) => set("billingCountry", e.target.value)}
                    placeholder="Italia"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h5 className="mt-2">Abbonamento</h5>

            <Row className="mt-1">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Importo *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Valuta</Form.Label>
                  <Form.Control
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Durata *</Form.Label>
                  <Form.Select
                    value={form.contractTerm}
                    onChange={(e) =>
                      set("contractTerm", e.target.value as ContractTerm)
                    }
                  >
                    {CONTRACT_TERM.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Rateizzazione *</Form.Label>
                  <Form.Select
                    value={form.installmentPlan}
                    onChange={(e) =>
                      set("installmentPlan", e.target.value as InstallmentPlan)
                    }
                  >
                    <option value="ONE_SHOT">Unica soluzione (annuale)</option>
                    <option value="SEMESTRALE">2 rate (semestrali)</option>
                    <option value="TRIMESTRALE">4 rate (trimestrali)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h5 className="mt-2">Credenziali Owner</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password *</Form.Label>
                  <Form.Control
                    type="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Minimo 8 caratteri"
                    required
                    minLength={8}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Conferma password *</Form.Label>
                  <Form.Control
                    type="password"
                    value={form.passwordConfirm}
                    onChange={(e) => set("passwordConfirm", e.target.value)}
                    placeholder="Ridigita la password"
                    required
                    minLength={8}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-2">
              <Button type="submit" variant="dark" disabled={loading}>
                {loading ? "Invio…" : "Registra azienda"}
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
    </div>
  );
}



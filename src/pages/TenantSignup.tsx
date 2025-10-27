// src/pages/TenantSignup.tsx
import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { signupTenantUser } from "@/lib/tenantAuth.service";

export default function TenantSignup() {
  const [clientId, setClientId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN"|"AGENT">("ADMIN");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string|undefined>();
  const [err, setErr] = useState<string|undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setOk(undefined); setErr(undefined);
    if (!clientId || !email || !password || !role) { setErr("clientId, email, password e role sono obbligatori."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Email non valida"); return; }
    if (password.length < 8) { setErr("Password minima 8 caratteri"); return; }
    setLoading(true);
    try {
      await signupTenantUser({ clientId, email, password, role });
      setOk("Utente creato. Controlla l’email per l’accesso.");
      setClientId(""); setEmail(""); setPassword(""); setRole("ADMIN");
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setErr("Email già registrata.");
      else if (status === 400) setErr("clientId, email, password e role sono obbligatori.");
      else setErr(e?.response?.data?.message || e?.message || "Errore creazione utente");
    } finally { setLoading(false); }
  }

  return (
    <div className="container py-4">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: 600 }}>
        <Card.Body>
          <h3 className="mb-3">Tenant User Signup</h3>
          {ok && <Alert variant="success">{ok}</Alert>}
          {err && <Alert variant="danger">{err}</Alert>}
          <Form onSubmit={onSubmit}>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Client ID *</Form.Label><Form.Control value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="acme" required /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Ruolo *</Form.Label><Form.Select value={role} onChange={(e) => setRole(e.target.value as any)}><option value="ADMIN">ADMIN</option><option value="AGENT">AGENT</option></Form.Select></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Email *</Form.Label><Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@acme.it" required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Password *</Form.Label><Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></Form.Group>
            <div className="d-flex gap-2"><Button type="submit" variant="dark" disabled={loading}>{loading ? "Invio…" : "Crea utente"}</Button></div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}


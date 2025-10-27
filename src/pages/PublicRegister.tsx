// src/pages/PublicRegister.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import api, { v1 } from "@/lib/api";

function extractClientId(data: any): string | undefined {
  return data?.clientId || data?.data?.clientId || data?.client?.id || data?.id;
}

export default function PublicRegister() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validazione base
    if (!companyName || !email || !password || !password2) {
      setError("Compila tutti i campi obbligatori.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email non valida");
      return;
    }
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== password2) {
      setError("Le password non coincidono.");
      return;
    }
    if (!accept) {
      setError("Devi accettare i termini per continuare.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { companyName, email, password, plan: "BASIC" };
      const metadata: any = {};
      if (vatNumber) metadata.vatNumber = vatNumber;
      if (address) metadata.address = address;
      if (zip) metadata.zip = zip;
      if (city) metadata.city = city;
      if (province) metadata.province = province;
      if (phone) metadata.phone = phone;
      if (notes) metadata.notes = notes;
      if (Object.keys(metadata).length) payload.metadata = metadata;

      // 1) Crea TENANT
      const resTenant = await api.post(
        v1("public/clients/signup"),
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      const clientId = extractClientId(resTenant.data);
      if (!clientId) throw new Error("ClientId non presente nella risposta.");

      // 2) Crea ADMIN nel tenant
      await api.post(
        v1("tenant/auth/signup"),
        { email, password, role: "ADMIN" },
        { headers: { "Content-Type": "application/json", "x-tenant-id": clientId }, withCredentials: true }
      );

      // 3) Salva tenant + redirect
      localStorage.setItem("lmw_tenant_id", clientId);
      navigate(`/login?tenant=${clientId}`, { replace: true, state: { tenantId: clientId, emailPrefill: email } });
    } catch (err: any) {
      if (err?.response?.status === 409) setError("Email già registrata.");
      else if (err?.response?.status === 400) setError("Dati non validi.");
      else setError("Errore durante la registrazione.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: 640 }}>
        <Card.Body>
          <h3 className="mb-3">Registrazione azienda</h3>
          <p className="text-muted">Compila i campi per creare il tenant e l'utente amministratore.</p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Ragione sociale *</Form.Label>
              <Form.Control value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="ACME S.r.l." />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email amministratore *</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@acme.it" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password *</Form.Label>
              <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minimo 8 caratteri" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Conferma password *</Form.Label>
              <Form.Control type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required minLength={8} />
            </Form.Group>

            {/* Opzionali */}
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Partita IVA</Form.Label>
                  <Form.Control value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Telefono</Form.Label>
                  <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Indirizzo</Form.Label>
              <Form.Control value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Via Roma 1" />
            </Form.Group>
            <div className="row g-2">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>CAP</Form.Label>
                  <Form.Control value={zip} onChange={(e) => setZip(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-5">
                <Form.Group className="mb-3">
                  <Form.Label>Città</Form.Label>
                  <Form.Control value={city} onChange={(e) => setCity(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Provincia</Form.Label>
                  <Form.Control value={province} onChange={(e) => setProvince(e.target.value.toUpperCase())} maxLength={2} />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Note</Form.Label>
              <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check type="checkbox" id="accept" label="Accetto i termini" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            </Form.Group>
            <div className="d-grid gap-2">
              <Button type="submit" variant="dark" disabled={loading}>
                {loading ? "Creazione in corso..." : "Crea azienda"}
              </Button>
              <Button type="button" variant="outline-secondary" onClick={() => navigate('/login')}>Torna al login</Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}


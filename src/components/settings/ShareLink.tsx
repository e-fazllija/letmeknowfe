import { useMemo, useState } from "react";
import { Form, Button, InputGroup, Row, Col, Modal, Alert } from "react-bootstrap";

export default function ShareLink() {
  // Link pubblico (mock o preso da localStorage/env)
  const defaultLink = useMemo(() => {
    const saved = localStorage.getItem("lmw_public_link");
    if (saved) return saved;
    return `${window.location.origin}/secure/report`;
  }, []);

  const [link] = useState<string>(defaultLink);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: ignorato
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section>
        <h6 className="mb-2">Condividi il tuo link di segnalazione</h6>
        <p className="text-secondary mb-3">
          Copia e distribuisci questo link nella tua organizzazione per permettere l’invio delle segnalazioni.
        </p>

        <Row className="g-2 align-items-center">
          <Col md={9} sm={12}>
            <InputGroup>
              <InputGroup.Text className="fw-semibold">URL</InputGroup.Text>
              <Form.Control value={link} readOnly />
            </InputGroup>
          </Col>
          <Col md={3} sm={12} className="d-grid d-sm-flex gap-2">
            <Button variant="outline-secondary" onClick={copy}>Copia</Button>
            <Button variant="outline-secondary" onClick={() => setShowQR(true)}>QR</Button>
          </Col>
        </Row>

        {copied && (
          <Alert variant="success" className="mt-3 py-2 mb-0">
            Link copiato negli appunti.
          </Alert>
        )}
      </section>

      {/* Modale QR */}
      <Modal show={showQR} onHide={() => setShowQR(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>QR code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            alt="QR del link di segnalazione"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
              link
            )}`}
          />
          <div className="small text-secondary mt-2">{link}</div>
        </Modal.Body>
        <Modal.Footer className="d-grid d-sm-flex">
          <Button variant="outline-secondary" onClick={() => setShowQR(false)}>
            Chiudi
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

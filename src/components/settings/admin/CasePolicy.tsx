import { Form, Button, Row, Col } from "react-bootstrap";

export default function CasePolicy() {
  return (
    <Form>
      <h6 className="mb-3">Gestione del caso (policy)</h6>
      <Row className="g-3">
        <Col md={6}>
          <Form.Check type="switch" id="restrict-visibility" label="Visibilità caso solo a team assegnati" />
        </Col>
        <Col md={6}>
          <Form.Check type="switch" id="allow-mentions" label="Consenti @mention nei commenti" defaultChecked />
        </Col>
        <Col md={6}>
          <Form.Check type="switch" id="redact-pii" label="Redazione automatica di PII nei documenti" />
        </Col>
        <Col md={6}>
          <Form.Check type="switch" id="allow-attachments" label="Consenti allegati da parte del segnalante" defaultChecked />
        </Col>
      </Row>
      <div className="mt-3">
        <Button variant="dark">Salva</Button>
      </div>
    </Form>
  );
}

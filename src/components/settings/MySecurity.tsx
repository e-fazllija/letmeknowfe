import { Form, Button, Row, Col, Alert } from "react-bootstrap";

export default function MySecurity() {
  return (
    <>
      <Alert variant="secondary">Consigliato: attiva l’autenticazione a due fattori.</Alert>

      <Form className="mb-4">
        <h6 className="mb-3">Cambio password</h6>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Password attuale</Form.Label>
              <Form.Control type="password" />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Nuova password</Form.Label>
              <Form.Control type="password" />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Conferma password</Form.Label>
              <Form.Control type="password" />
            </Form.Group>
          </Col>
        </Row>
        <div className="mt-3">
          <Button variant="dark">Aggiorna password</Button>
        </div>
      </Form>

      <Form>
        <h6 className="mb-3">Autenticazione a due fattori</h6>
        <Form.Check type="switch" id="twofa" label="Abilita 2FA (TOTP)" />
        <div className="mt-3">
          <Button variant="dark">Configura TOTP</Button>
        </div>
      </Form>
    </>
  );
}

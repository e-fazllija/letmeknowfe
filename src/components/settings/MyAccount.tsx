import { Form, Button, Row, Col } from "react-bootstrap";

export default function MyAccount() {
  return (
    <Form>
      <Row className="g-3">
        <Col md={2}>
          <div
            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
            style={{ width: 72, height: 72 }}
          >
            <span className="text-white fw-bold">LC</span>
          </div>
        </Col>
        <Col md={5}>
          <Form.Group>
            <Form.Label className="fw-semibold">Nome</Form.Label>
            <Form.Control type="text" placeholder="Lorenzo" />
          </Form.Group>
        </Col>
        <Col md={5}>
          <Form.Group>
            <Form.Label className="fw-semibold">Cognome</Form.Label>
            <Form.Control type="text" placeholder="Cani" />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label className="fw-semibold">Email</Form.Label>
            <Form.Control type="email" placeholder="nome@azienda.it" disabled />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label className="fw-semibold">Telefono</Form.Label>
            <Form.Control type="tel" placeholder="+39 ..." />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label className="fw-semibold">Lingua</Form.Label>
            <Form.Select>
              <option>Italiano</option>
              <option>English</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <div className="mt-3 d-flex gap-2">
        <Button variant="dark">Salva</Button>
        <Button variant="outline-secondary">Annulla</Button>
      </div>
    </Form>
  );
}

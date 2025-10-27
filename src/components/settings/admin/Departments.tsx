import { Form, Button, Row, Col } from "react-bootstrap";

export default function Departments() {
  return (
    <Form>
      <h6 className="mb-3">Reparti / Team</h6>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label className="fw-semibold">Nome reparto</Form.Label>
            <Form.Control type="text" placeholder="Compliance" />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="fw-semibold">Responsabile</Form.Label>
            <Form.Control type="text" placeholder="Nome Cognome" />
          </Form.Group>
        </Col>
        <Col md={2} className="d-flex align-items-end">
          <Button variant="dark">Aggiungi</Button>
        </Col>
      </Row>
      <p className="text-muted mt-3">Nessun reparto configurato.</p>
    </Form>
  );
}

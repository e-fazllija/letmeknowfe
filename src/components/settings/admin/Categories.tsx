import { Form, Button, Row, Col } from "react-bootstrap";

export default function Categories() {
  return (
    <Form>
      <h6 className="mb-3">Categorie</h6>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label className="fw-semibold">Nome categoria</Form.Label>
            <Form.Control type="text" placeholder="Corruzione" />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="fw-semibold">Severità predefinita</Form.Label>
            <Form.Select>
              <option>Bassa</option>
              <option>Media</option>
              <option>Alta</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2} className="d-flex align-items-end">
          <Button variant="dark">Aggiungi</Button>
        </Col>
      </Row>
      <p className="text-muted mt-3">Nessuna categoria configurata.</p>
    </Form>
  );
}

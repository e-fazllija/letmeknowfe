import { Form, Button, Row, Col } from "react-bootstrap";

export default function UsersRoles() {
  return (
    <div>
      <h6 className="mb-3">Utenti & Ruoli</h6>

      <Form className="mb-4">
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold">Email da invitare</Form.Label>
              <Form.Control type="email" placeholder="nome@azienda.it" />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Ruolo</Form.Label>
              <Form.Select>
                <option>user</option>
                <option>admin</option>
                <option>case-manager</option>
                <option>reviewer</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex align-items-end">
            <Button variant="dark">Invita</Button>
          </Col>
        </Row>
      </Form>

      <Form>
        <h6 className="mb-2">Permessi (solo visuale)</h6>
        <div className="d-flex flex-column gap-1">
          <Form.Check label="REPORT_CREATE" disabled />
          <Form.Check label="REPORTS_VIEW" disabled defaultChecked />
          <Form.Check label="REPORTS_VIEW_ALL" disabled />
          <Form.Check label="ASSIGN_CASE" disabled />
          <Form.Check label="EXPORT_ORG_DATA" disabled />
        </div>
      </Form>
    </div>
  );
}

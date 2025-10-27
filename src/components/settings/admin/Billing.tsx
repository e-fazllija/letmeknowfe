import { Form, Button, Row, Col } from "react-bootstrap";
import { useState } from "react";

export default function Billing() {
  const [method, setMethod] = useState<"carta" | "bonifico" | "nessuno">("nessuno");

  return (
    <div className="d-flex flex-column gap-4">
      {/* Indirizzi di fatturazione */}
      <section>
        <h6 className="mb-3">Indirizzi di fatturazione</h6>
        <Form>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Ragione sociale</Form.Label>
                <Form.Control type="text" placeholder="Nome azienda S.p.A." />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Partita IVA / Codice fiscale</Form.Label>
                <Form.Control type="text" placeholder="IT12345678901" />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group>
                <Form.Label className="fw-semibold">Indirizzo</Form.Label>
                <Form.Control type="text" placeholder="Via Roma 1" />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold">CAP</Form.Label>
                <Form.Control type="text" placeholder="00100" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Città</Form.Label>
                <Form.Control type="text" placeholder="Roma" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Provincia</Form.Label>
                <Form.Control type="text" placeholder="RM" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Paese</Form.Label>
                <Form.Select defaultValue="Italia">
                  <option>Italia</option>
                  <option>Romania</option>
                  <option>Germania</option>
                  <option>Altro</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Email di fatturazione</Form.Label>
                <Form.Control type="email" placeholder="billing@azienda.it" />
              </Form.Group>
            </Col>
          </Row>
          <div className="mt-3">
            <Button variant="dark">Salva indirizzo</Button>
          </div>
        </Form>
      </section>

      {/* Sottoscrizione */}
      <section>
        <h6 className="mb-3">Sottoscrizione</h6>
        <Form>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Piano</Form.Label>
                <Form.Select defaultValue="">
                  <option value="" disabled>Seleziona un piano</option>
                  <option value="base">Base</option>
                  <option value="avanzato">Avanzato</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Ciclo</Form.Label>
                <Form.Select defaultValue="mensile">
                  <option value="mensile">Mensile</option>
                  <option value="annuale">Annuale</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Stato abbonamento</Form.Label>
                <Form.Control type="text" value="Attivo" disabled />
              </Form.Group>
            </Col>
          </Row>
          <div className="mt-3">
            <Button variant="dark">Aggiorna sottoscrizione</Button>
          </div>
        </Form>
      </section>

      {/* Metodo di pagamento (placeholder) */}
      <section>
        <h6 className="mb-3">Metodo di pagamento</h6>
        <Form>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Metodo</Form.Label>
                <Form.Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "carta" | "bonifico" | "nessuno")}
                >
                  <option value="nessuno">Seleziona…</option>
                  <option value="carta">Carta</option>
                  <option value="bonifico">Bonifico</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Campi carta (placeholder, nessun processing) */}
            {method === "carta" && (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Intestatario</Form.Label>
                    <Form.Control type="text" placeholder="Nome Cognome" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Numero carta</Form.Label>
                    <Form.Control type="text" placeholder="•••• •••• •••• ••••" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Scadenza</Form.Label>
                    <Form.Control type="text" placeholder="MM/YY" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">CVC</Form.Label>
                    <Form.Control type="password" placeholder="•••" />
                  </Form.Group>
                </Col>
              </>
            )}

            {/* Campi bonifico (placeholder) */}
            {method === "bonifico" && (
              <>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">IBAN</Form.Label>
                    <Form.Control type="text" placeholder="IT60X0542811101000000123456" />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Intestatario</Form.Label>
                    <Form.Control type="text" placeholder="Nome azienda S.p.A." />
                  </Form.Group>
                </Col>
              </>
            )}
          </Row>

          <div className="mt-3 d-flex gap-2">
            <Button variant="dark">Salva metodo</Button>
            <Button variant="outline-secondary">Rimuovi metodo</Button>
          </div>

          <div className="form-text mt-2">
            I dati inseriti sono segnaposto: l’elaborazione reale dei pagamenti sarà integrata successivamente.
          </div>
        </Form>
      </section>
    </div>
  );
}

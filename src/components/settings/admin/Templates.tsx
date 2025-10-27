import { useEffect, useState } from "react";
import { Form, Button, Row, Col, ListGroup } from "react-bootstrap";
import { TemplatesStore, newId } from "../../../lib/templates";
import type { TemplateModel, TemplateQuestion } from "../../../lib/templates";

export default function Templates() {
  const [models, setModels] = useState<TemplateModel[]>([]);
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<TemplateQuestion[]>([]);
  const [qInput, setQInput] = useState("");

  useEffect(() => {
    setModels(TemplatesStore.list());
  }, []);

  function addQuestion() {
    const label = qInput.trim();
    if (!label) return;
    setQuestions(prev => [...prev, { id: newId("q"), label }]);
    setQInput("");
  }

  function saveModel() {
    const model: TemplateModel = { id: newId(), name: name.trim(), questions };
    if (!model.name || model.questions.length === 0) return;
    TemplatesStore.upsert(model);
    setModels(TemplatesStore.list());
    setName("");
    setQuestions([]);
  }

  function removeModel(id: string) {
    TemplatesStore.remove(id);
    setModels(TemplatesStore.list());
  }

  return (
    <div className="d-flex flex-column gap-4">
      {/* Crea nuovo modello */}
      <section>
        <h6 className="mb-3">Crea modello</h6>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold">Nome modello</Form.Label>
              <Form.Control
                type="text"
                placeholder="Es. Segnalazione HR"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="mt-3">
          <Form.Label className="fw-semibold">Domande per il modello</Form.Label>
          <Row className="g-2 align-items-center">
            <Col md={9}>
              <Form.Control
                type="text"
                placeholder="Inserisci una domanda"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
              />
            </Col>
            <Col md={3} className="d-grid">
              <Button variant="outline-secondary" onClick={addQuestion}>Aggiungi domanda</Button>
            </Col>
          </Row>

          {questions.length > 0 && (
            <ListGroup className="mt-3">
              {questions.map(q => (
                <ListGroup.Item key={q.id} className="d-flex justify-content-between">
                  <span>{q.label}</span>
                  <Button size="sm" variant="outline-secondary" onClick={() => setQuestions(questions.filter(x => x.id !== q.id))}>
                    Rimuovi
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>

        <div className="mt-3 d-flex gap-2">
          <Button variant="dark" onClick={saveModel} disabled={!name.trim() || questions.length === 0}>Salva modello</Button>
          <Button variant="outline-secondary" onClick={() => { setName(""); setQuestions([]); setQInput(""); }}>Annulla</Button>
        </div>
      </section>

      {/* Elenco modelli salvati */}
      <section>
        <h6 className="mb-2">Modelli salvati</h6>
        {models.length === 0 ? (
          <div className="text-secondary">Nessun modello configurato.</div>
        ) : (
          <ListGroup>
            {models.map(m => (
              <ListGroup.Item key={m.id} className="d-flex justify-content-between">
                <div>
                  <div className="fw-semibold">{m.name}</div>
                  <div className="small text-secondary">{m.questions.length} domande</div>
                </div>
                <div className="d-flex gap-2">
                  {/* estensioni future: modifica/duplica */}
                  <Button size="sm" variant="outline-secondary" onClick={() => removeModel(m.id)}>Elimina</Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </section>
    </div>
  );
}

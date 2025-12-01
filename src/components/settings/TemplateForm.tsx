import { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import type { Template, TemplateQuestion } from '@/lib/settings.service';

export default function TemplateForm({ show, onClose, initial, onSubmit }: { show: boolean; onClose: () => void; initial?: Template | null; onSubmit: (v: { name: string; questions: TemplateQuestion[] }) => Promise<void> | void }) {
  const [name, setName] = useState<string>('');
  const [questions, setQuestions] = useState<TemplateQuestion[]>([]);
  const [qLabel, setQLabel] = useState('');
  const [qType, setQType] = useState<TemplateQuestion['type']>('TEXT');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setQuestions((initial.questions || []).slice().sort((a,b) => (a.order||0)-(b.order||0)));
    } else { setName(''); setQuestions([]); }
  }, [initial]);

  const addQuestion = () => {
    const label = qLabel.trim();
    if (!label) return;
    const order = (questions[questions.length-1]?.order ?? 0) + 1;
    setQuestions(prev => [
      ...prev,
      {
        type: qType,
        label,
        required: false,
        order,
      },
    ]);
    setQLabel('');
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton><Modal.Title>{initial ? 'Modifica template' : 'Nuovo template'}</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-2">
            <Form.Label>Nome</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Segnalazione HR" />
          </Form.Group>
          <div className="mt-3">
            <Form.Label>Domande</Form.Label>
            <div className="d-flex align-items-center gap-2 mb-2">
              <Form.Select style={{ width: 150 }} value={qType} onChange={(e) => setQType(e.target.value as any)}>
                {['TEXT','TEXTAREA','SELECT','MULTISELECT','RADIO','CHECKBOX','DATE','NUMBER','FILE'].map(t => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
              <Form.Control placeholder="Etichetta" value={qLabel} onChange={(e) => setQLabel(e.target.value)} onKeyDown={(e) => { if (e.key==='Enter'){ e.preventDefault(); addQuestion(); }}} />
              <Button variant="outline-secondary" onClick={addQuestion}>Aggiungi</Button>
            </div>
            {questions.length === 0 ? (
              <div className="text-muted">Nessuna domanda.</div>
            ) : (
              <ul className="list-group">
                {questions.map((q, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">[{q.type}] {q.label}</div>
                      <small className="text-muted">{q.required ? 'Obbligatoria' : 'Facoltativa'} • Ordine {q.order}</small>
                    </div>
                    <div className="d-flex gap-2">
                      <Form.Check type="switch" label="Obbl." checked={!!q.required} onChange={(e) => setQuestions(prev => prev.map((x,i)=> i===idx ? { ...x, required: e.currentTarget.checked } : x))} />
                      <Button size="sm" variant="outline-danger" onClick={() => setQuestions(prev => prev.filter((_,i)=>i!==idx))}>Rimuovi</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button variant="dark" disabled={busy || !name.trim() || questions.length===0} onClick={async () => { try { setBusy(true); await onSubmit({ name: name.trim(), questions }); onClose(); } finally { setBusy(false); } }}>{busy ? '...' : 'Salva'}</Button>
      </Modal.Footer>
    </Modal>
  );
}


import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

export default function DepartmentForm({ show, onClose, onSubmit, initial }: { show: boolean; onClose: () => void; onSubmit: (v: { name: string }) => Promise<void> | void; initial?: { name?: string } }) {
  const [name, setName] = useState<string>(initial?.name || '');
  const [busy, setBusy] = useState(false);
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton><Modal.Title>{initial ? 'Modifica reparto' : 'Nuovo reparto'}</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Nome</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Compliance" />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button variant="dark" disabled={busy || !name.trim()} onClick={async () => { try { setBusy(true); await onSubmit({ name: name.trim() }); onClose(); } finally { setBusy(false); } }}>{busy ? '...' : 'Salva'}</Button>
      </Modal.Footer>
    </Modal>
  );
}


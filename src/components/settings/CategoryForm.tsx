import { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import type { Department } from '@/lib/settings.service';

export default function CategoryForm({ show, onClose, onSubmit, initial, departments }: { show: boolean; onClose: () => void; onSubmit: (v: { name: string; departmentId: string }) => Promise<void> | void; initial?: { name?: string; departmentId?: string }; departments: Department[] }) {
  const [name, setName] = useState<string>(initial?.name || '');
  const [departmentId, setDepartmentId] = useState<string>(initial?.departmentId || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!departmentId && departments[0]?.id) setDepartmentId(departments[0].id); }, [departments, departmentId]);
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton><Modal.Title>{initial ? 'Modifica categoria' : 'Nuova categoria'}</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-2">
            <Form.Label>Nome</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Corruzione" />
          </Form.Group>
          <Form.Group>
            <Form.Label>Reparto</Form.Label>
            <Form.Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button variant="dark" disabled={busy || !name.trim() || !departmentId} onClick={async () => { try { setBusy(true); await onSubmit({ name: name.trim(), departmentId }); onClose(); } finally { setBusy(false); } }}>{busy ? '...' : 'Salva'}</Button>
      </Modal.Footer>
    </Modal>
  );
}


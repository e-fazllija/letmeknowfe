import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Row, Spinner, Table, Toast, ToastContainer } from 'react-bootstrap';
import api, { v1 } from '@/lib/api';

type TenantUser = { id: string; email?: string; name?: string; role?: string; createdAt?: string };

export default function SettingsUsersTab() {
  const [items, setItems] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'AGENT' | 'ADMIN' | 'AUDITOR'>('AGENT');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success'|'danger'|'primary' }>({ show: false, message: '', variant: 'primary' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(v1('tenant/users'), { withCredentials: true });
      const arr = Array.isArray(res.data) ? (res.data as any[]) : [];
      setItems(arr.map((u) => ({ id: String(u.id), email: u.email, name: u.name || u.displayName, role: u.role, createdAt: u.createdAt })));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Errore caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const canSubmit = useMemo(() => {
    const hasEmail = email.trim().length > 3;
    return hasEmail && !creating;
  }, [email, creating]);

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setCreating(true);
    try {
      await api.post(v1('tenant/users/invite'), { email: email.trim(), role }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      setToast({ show: true, message: 'Invito inviato', variant: 'success' });
      setEmail('');
      await load();
    } catch (e: any) {
      setToast({ show: true, message: e?.response?.data?.message || e?.message || 'Errore invito utente', variant: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  const onDeactivateUser = async (u: TenantUser) => {
    if (!u?.id) return;
    if (String(u.role || '').toUpperCase() !== 'AGENT') {
      setToast({ show: true, message: 'Puoi disattivare solo utenti AGENT', variant: 'danger' });
      return;
    }
    const ok = confirm(`Disattivare l'utente ${u.email || u.id}?`);
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await api.delete(v1(`tenant/users/${encodeURIComponent(u.id)}`), { withCredentials: true, validateStatus: (s) => s >= 200 && s < 500 });
      setToast({ show: true, message: 'Utente disattivato', variant: 'success' });
      await load();
    } catch (e: any) {
      setToast({ show: true, message: e?.response?.data?.message || e?.message || 'Errore disattivazione utente', variant: 'danger' });
    } finally {
      setDeletingId(null);
    }
  };

  const onHardDeleteUser = async (u: TenantUser) => {
    if (!u?.id) return;
    if (String(u.role || '').toUpperCase() !== 'AGENT') {
      setToast({ show: true, message: 'Puoi eliminare solo utenti AGENT', variant: 'danger' });
      return;
    }
    const ok = confirm(`Eliminare definitivamente l'utente ${u.email || u.id}? Operazione irreversibile.`);
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await api.delete(v1(`tenant/users/${encodeURIComponent(u.id)}/hard`), { withCredentials: true, validateStatus: (s) => s >= 200 && s < 500 });
      setToast({ show: true, message: 'Utente eliminato definitivamente', variant: 'success' });
      await load();
    } catch (e: any) {
      setToast({ show: true, message: e?.response?.data?.message || e?.message || 'Errore eliminazione definitiva', variant: 'danger' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h6 className="mb-3">Utenti del tenant</h6>

      {/* Invite user */}
      <Form onSubmit={onCreateUser} className="mb-4">
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Email nuovo utente</Form.Label>
              <Form.Control type="email" placeholder="nome@azienda.it" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Ruolo</Form.Label>
              <Form.Select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="AGENT">AGENT</option>
                <option value="ADMIN">ADMIN</option>
                <option value="AUDITOR">AUDITOR</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="d-flex align-items-end h-100">
              <Button variant="dark" type="submit" disabled={!canSubmit}>
                {creating ? <Spinner size="sm" animation="border" /> : 'Crea utente'}
              </Button>
            </Form.Group>
          </Col>
        </Row>
      </Form>

      {/* List users */}
      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : items.length === 0 ? (
        <div className="text-muted">Nessun utente.</div>
      ) : (
        <Table striped hover responsive size="sm">
          <thead>
            <tr>
              <th>Email</th>
              <th style={{ width: 110 }}>Ruolo</th>
              <th style={{ width: 140 }} className="text-nowrap">Creato</th>
              <th style={{ width: 200 }} className="text-nowrap">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.email || <span className="text-muted">—</span>}</td>
                <td className="text-nowrap">
                  {u.role ? (
                    <Badge bg={roleColor(u.role)}>{u.role}</Badge>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-nowrap">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : <span className="text-muted">—</span>}</td>
                <td className="text-nowrap">
                  {String(u.role || '').toUpperCase() === 'AGENT' ? (
                    <div className="d-flex gap-2 justify-content-nowrap">
                      <Button size="sm" variant="warning" onClick={() => onDeactivateUser(u)} disabled={deletingId === u.id}>
                        {deletingId === u.id ? <Spinner size="sm" animation="border" /> : 'Disattiva'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onHardDeleteUser(u)} disabled={deletingId === u.id}>
                        Elimina
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.variant} onClose={() => setToast({ ...toast, show: false })} show={toast.show} autohide delay={2500}>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}

function roleColor(role?: string): 'primary' | 'secondary' | 'warning' | 'dark' | 'info' | 'success' | 'danger' {
  switch (String(role || '').toUpperCase()) {
    case 'ADMIN': return 'dark';
    case 'AGENT': return 'primary';
    case 'USER': return 'secondary';
    default: return 'info';
  }
}




import { useEffect, useMemo, useState } from 'react';
import { Button, Form, ListGroup, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { listCategories, listDepartments, createCategory, updateCategory, deleteCategory, type Category, type Department } from '@/lib/settings.service';
import CategoryForm from '@/components/settings/CategoryForm';

export default function SettingsCategoriesTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [items, setItems] = useState<Category[]>([]);
  const [depFilter, setDepFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success'|'danger'|'primary' }>({ show: false, message: '', variant: 'primary' });
  const [modal, setModal] = useState<{ show: boolean; item?: Category | null }>({ show: false });

  const load = async () => {
    setLoading(true);
    try {
      const [deps, cats] = await Promise.all([listDepartments(), listCategories(depFilter ? { departmentId: depFilter } : undefined)]);
      setDepartments(deps);
      setItems(cats);
    } catch (e: any) { setToast({ show: true, message: e?.message || 'Errore caricamento', variant: 'danger' }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [depFilter]);

  const depName = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <Form.Select style={{ width: 240 }} value={depFilter} onChange={(e) => setDepFilter(e.target.value)}>
            <option value="">Tutti i reparti</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Form.Select>
        </div>
        <Button size="sm" variant="dark" onClick={() => setModal({ show: true, item: null })}>Nuova</Button>
      </div>
      {loading ? <Spinner animation="border" size="sm" /> : (
        items.length === 0 ? <div className="text-muted">Nessuna categoria.</div> : (
          <ListGroup>
            {items.map(c => (
              <ListGroup.Item key={c.id} className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">{c.name}</div>
                  <small className="text-muted">{depName.get(c.departmentId) || '-'}</small>
                </div>
                <div className="d-flex gap-2">
                  {(() => {
                    type Protectable = { builtin?: boolean; builtIn?: boolean; system?: boolean; readOnly?: boolean; readonly?: boolean; protected?: boolean; isDefault?: boolean; createdBy?: string | null };
                    const o = c as unknown as Protectable;
                    const truthy = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
                    const isProtected = truthy(o?.builtin) || truthy(o?.builtIn) || truthy(o?.system) || truthy(o?.readOnly) || truthy(o?.readonly) || truthy(o?.protected) || truthy(o?.isDefault);
                    return !isProtected ? (
                      <>
                        <Button size="sm" variant="outline-secondary" onClick={() => setModal({ show: true, item: c })}>Modifica</Button>
                        <Button size="sm" variant="outline-danger" onClick={async () => { if (!confirm('Eliminare la categoria?')) return; try { await deleteCategory(c.id); setToast({ show: true, message: 'Categoria eliminata', variant: 'success' }); load(); } catch { setToast({ show: true, message: 'Errore eliminazione', variant: 'danger' }); } }}>Elimina</Button>
                      </>
                    ) : (
                      <small className="text-muted">Predefinita</small>
                    );
                  })()}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )
      )}

      {modal.show && (
        <CategoryForm
          show={modal.show}
          initial={modal.item || undefined}
          departments={departments}
          onClose={() => setModal({ show: false })}
          onSubmit={async (v) => { try {
            if (modal.item) { await updateCategory(modal.item.id, v); setToast({ show: true, message: 'Categoria aggiornata', variant: 'success' }); }
            else { await createCategory(v); setToast({ show: true, message: 'Categoria creata', variant: 'success' }); }
            load();
          } catch { setToast({ show: true, message: 'Errore salvataggio', variant: 'danger' }); } }}
        />
      )}

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.variant} onClose={() => setToast({ ...toast, show: false })} show={toast.show} autohide delay={2500}>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}


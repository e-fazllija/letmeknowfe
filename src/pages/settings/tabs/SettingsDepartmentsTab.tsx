import { useEffect, useState } from 'react';
import { Button, ListGroup, Spinner, Toast, ToastContainer, Form } from 'react-bootstrap';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment, type Department } from '@/lib/settings.service';
import DepartmentForm from '@/components/settings/DepartmentForm';
import { isDepartmentHidden, setDepartmentVisible } from '@/lib/visibility.prefs';

export default function SettingsDepartmentsTab() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success'|'danger'|'primary' }>({ show: false, message: '', variant: 'primary' });
  const [modal, setModal] = useState<{ show: boolean; item?: Department | null }>({ show: false });

  const load = async () => {
    setLoading(true);
    try { setItems(await listDepartments()); } catch (e: any) { setToast({ show: true, message: e?.message || 'Errore caricamento', variant: 'danger' }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Reparti</h6>
        <Button size="sm" variant="dark" onClick={() => setModal({ show: true, item: null })}>Nuovo</Button>
      </div>
      {loading ? <Spinner animation="border" size="sm" /> : (
        items.length === 0 ? <div className="text-muted">Nessun reparto.</div> : (
          <ListGroup>
            {items.map(d => (
              <ListGroup.Item key={d.id} className="py-2">
                <div className="d-flex align-items-center" style={{ gap: 12 }}>
                  <div className="flex-grow-1">{d.name}</div>
                  <div className="flex-shrink-0" style={{ width: 120, whiteSpace: 'nowrap' }}>
                  <Form.Check
                    type="switch"
                    id={`dep-visible-${d.id}`}
                    label="Mostra"
                    checked={!isDepartmentHidden(d.id)}
                    onChange={(e) => {
                      try {
                        setDepartmentVisible(d.id, e.currentTarget.checked);
                        setToast({ show: true, message: e.currentTarget.checked ? 'Reparto visibile' : 'Reparto nascosto', variant: 'success' });
                      } catch {
                        setToast({ show: true, message: 'Errore aggiornamento visibilità', variant: 'danger' });
                      }
                    }}
                  />
                  </div>
                  <div className="flex-shrink-0 d-flex gap-2" style={{ width: 220, justifyContent: 'flex-end' }}>
                  {(() => {
                    type Protectable = { builtin?: boolean; builtIn?: boolean; system?: boolean; readOnly?: boolean; readonly?: boolean; protected?: boolean; isDefault?: boolean; createdBy?: string | null };
                    const o = d as unknown as Protectable;
                    const truthy = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
                    const isProtected = truthy(o?.builtin) || truthy(o?.builtIn) || truthy(o?.system) || truthy(o?.readOnly) || truthy(o?.readonly) || truthy(o?.protected) || truthy(o?.isDefault);
                    return !isProtected ? (
                      <>
                        <Button size="sm" variant="outline-secondary" onClick={() => setModal({ show: true, item: d })}>Modifica</Button>
                        <Button size="sm" variant="outline-danger" onClick={async () => { if (!confirm('Eliminare il reparto?')) return; try { await deleteDepartment(d.id); setToast({ show: true, message: 'Reparto eliminato', variant: 'success' }); load(); } catch { setToast({ show: true, message: 'Errore eliminazione', variant: 'danger' }); } }}>Elimina</Button>
                      </>
                    ) : (
                      <small className="text-muted">Predefinito</small>
                    );
                  })()}
                </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )
      )}

      {modal.show && (
        <DepartmentForm
          show={modal.show}
          initial={modal.item || undefined}
          onClose={() => setModal({ show: false })}
          onSubmit={async (v) => { try {
            if (modal.item) { await updateDepartment(modal.item.id, v); setToast({ show: true, message: 'Reparto aggiornato', variant: 'success' }); }
            else { await createDepartment(v); setToast({ show: true, message: 'Reparto creato', variant: 'success' }); }
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


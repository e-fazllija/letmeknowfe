import { useEffect, useState } from 'react';
import { Button, ListGroup, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, type Template } from '@/lib/settings.service';
import TemplateForm from '@/components/settings/TemplateForm';

export default function SettingsTemplatesTab() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success'|'danger'|'primary' }>({ show: false, message: '', variant: 'primary' });
  const [modal, setModal] = useState<{ show: boolean; item?: Template | null }>({ show: false });

  const load = async () => {
    setLoading(true);
    try { setItems(await listTemplates()); } catch (e: any) { setToast({ show: true, message: e?.message || 'Errore caricamento', variant: 'danger' }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Template</h6>
        <Button size="sm" variant="dark" onClick={() => setModal({ show: true, item: null })}>Nuovo</Button>
      </div>
      {loading ? <Spinner animation="border" size="sm" /> : (
        items.length === 0 ? <div className="text-muted">Nessun template.</div> : (
          <ListGroup>
            {items.map(t => (
              <ListGroup.Item key={t.id} className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">{t.name}</div>
                  <small className="text-muted">{t.questions?.length || 0} domande</small>
                </div>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="outline-secondary" onClick={() => setModal({ show: true, item: t })}>Modifica</Button>
                  <Button size="sm" variant="outline-danger" onClick={async () => { if (!confirm('Eliminare il template?')) return; try { await deleteTemplate(t.id); setToast({ show: true, message: 'Template eliminato', variant: 'success' }); load(); } catch { setToast({ show: true, message: 'Errore eliminazione', variant: 'danger' }); } }}>Elimina</Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )
      )}

      {modal.show && (
        <TemplateForm
          show={modal.show}
          initial={modal.item || undefined}
          onClose={() => setModal({ show: false })}
          onSubmit={async (v) => { try { if (modal.item) { await updateTemplate(modal.item.id, v); setToast({ show: true, message: 'Template aggiornato', variant: 'success' }); } else { await createTemplate(v); setToast({ show: true, message: 'Template creato', variant: 'success' }); } load(); } catch { setToast({ show: true, message: 'Errore salvataggio', variant: 'danger' }); } }}
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


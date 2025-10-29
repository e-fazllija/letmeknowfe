import { useEffect, useState } from 'react';
import { Button, Col, Form, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { getCasePolicy, updateCasePolicy, type CasePolicy } from '@/lib/settings.service';
import { EXPERIMENTAL_POLICY_FIELDS } from '@/config';

export default function SettingsCasePolicyTab() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<CasePolicy>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success'|'danger'|'primary' }>({ show: false, message: '', variant: 'primary' });

  useEffect(() => {
    (async () => {
      try { setLoading(true); const p = await getCasePolicy(); setPolicy(p || {}); }
      catch { setPolicy({}); }
      finally { setLoading(false); }
    })();
  }, []);

  async function onSave() {
    try { await updateCasePolicy(policy); setToast({ show: true, message: 'Policy salvata', variant: 'success' }); }
    catch { setToast({ show: true, message: 'Errore salvataggio', variant: 'danger' }); }
  }

  if (loading) return <Spinner animation="border" size="sm" />;

  return (
    <div>
      <Form>
        <Row className="g-3">
          <Col md={6}><Form.Check type="switch" label="Restrizione visibilità per team assegnati" checked={!!policy.restrictVisibility} onChange={(e) => setPolicy({ ...policy, restrictVisibility: e.currentTarget.checked })} /></Col>
          <Col md={6}><Form.Check type="switch" label="Consenti @mention nei commenti" checked={!!policy.allowMentions} onChange={(e) => setPolicy({ ...policy, allowMentions: e.currentTarget.checked })} /></Col>
          <Col md={6}><Form.Check type="switch" label="Redazione automatica PII" checked={!!policy.redactPii} onChange={(e) => setPolicy({ ...policy, redactPii: e.currentTarget.checked })} /></Col>
          <Col md={6}><Form.Check type="switch" label="Consenti allegati" checked={!!policy.allowAttachments} onChange={(e) => setPolicy({ ...policy, allowAttachments: e.currentTarget.checked })} /></Col>

          {EXPERIMENTAL_POLICY_FIELDS && (
            <>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Privacy predefinita</Form.Label>
                  <Form.Select value={policy.privacyDefault || ''} onChange={(e) => setPolicy({ ...policy, privacyDefault: (e.target.value as any) || undefined })}>
                    <option value="">--</option>
                    <option value="ANONIMO">ANONIMO</option>
                    <option value="CONFIDENZIALE">CONFIDENZIALE</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}><Form.Check type="switch" label="Consenti segnalazioni anonime" checked={!!policy.allowAnonymous} onChange={(e) => setPolicy({ ...policy, allowAnonymous: e.currentTarget.checked })} /></Col>
            </>
          )}
        </Row>
        <div className="mt-3"><Button variant="dark" onClick={onSave}>Salva</Button></div>
      </Form>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.variant} onClose={() => setToast({ ...toast, show: false })} show={toast.show} autohide delay={2500}>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}


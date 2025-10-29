import { useEffect, useState } from 'react';
import { Button, Col, Form, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { getBillingProfile, updateBillingProfile, getSubscription, updateSubscription, getPaymentMethod, updatePaymentMethod, type BillingProfile, type Subscription, type PaymentMethodMasked } from '@/lib/settings.service';

export default function SettingsBillingTab() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payment, setPayment] = useState<PaymentMethodMasked | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success'|'danger'|'primary' }>({ show: false, message: '', variant: 'primary' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, s, pm] = await Promise.all([getBillingProfile().catch(()=>null), getSubscription().catch(()=>null), getPaymentMethod().catch(()=>null)]);
        setProfile(p);
        setSubscription(s);
        setPayment(pm);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner animation="border" size="sm" />;

  const defaultProfile: BillingProfile = { legalName: '', address: { country: '', city: '', zip: '', line1: '' }, emailForInvoices: '' };

  return (
    <div className="d-flex flex-column gap-4">
      <section>
        <h6 className="mb-3">Profilo fatturazione</h6>
        <Form>
          <Row className="g-2">
            <Col md={6}><Form.Group><Form.Label>Ragione sociale</Form.Label><Form.Control value={profile?.legalName || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), legalName: e.target.value}))} /></Form.Group></Col>
            <Col md={6}><Form.Group><Form.Label>Partita IVA</Form.Label><Form.Control value={profile?.vatNumber || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), vatNumber: e.target.value}))} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label>Paese</Form.Label><Form.Control value={profile?.address?.country || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), address:{ ...(p?.address||defaultProfile.address), country: e.target.value }}))} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label>Città</Form.Label><Form.Control value={profile?.address?.city || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), address:{ ...(p?.address||defaultProfile.address), city: e.target.value }}))} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label>CAP</Form.Label><Form.Control value={profile?.address?.zip || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), address:{ ...(p?.address||defaultProfile.address), zip: e.target.value }}))} /></Form.Group></Col>
            <Col md={8}><Form.Group><Form.Label>Indirizzo</Form.Label><Form.Control value={profile?.address?.line1 || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), address:{ ...(p?.address||defaultProfile.address), line1: e.target.value }}))} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label>Email fatture</Form.Label><Form.Control type="email" value={profile?.emailForInvoices || ''} onChange={(e)=>setProfile(p=>({...(p||defaultProfile), emailForInvoices: e.target.value}))} /></Form.Group></Col>
          </Row>
          <div className="mt-2"><Button variant="dark" onClick={async ()=>{ try { if (profile) { await updateBillingProfile(profile); setToast({ show:true, message:'Profilo aggiornato', variant:'success' }); } } catch { setToast({ show:true, message:'Errore salvataggio', variant:'danger' }); } }}>Salva profilo</Button></div>
        </Form>
      </section>

      <section>
        <h6 className="mb-3">Sottoscrizione</h6>
        <Form>
          <Row className="g-2">
            <Col md={4}><Form.Group><Form.Label>Piano</Form.Label><Form.Select value={subscription?.plan || 'FREE'} onChange={(e)=>setSubscription(s=>({...(s || { status:'ACTIVE', period:{currentStart:'', currentEnd:''}, seats: 1, plan:'FREE'}), plan: e.target.value as any }))}><option value="FREE">FREE</option><option value="PRO">PRO</option><option value="ENTERPRISE">ENTERPRISE</option></Form.Select></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label>Postazioni</Form.Label><Form.Control type="number" value={subscription?.seats || 1} onChange={(e)=>setSubscription(s=>({...(s || { status:'ACTIVE', period:{currentStart:'', currentEnd:''}, seats: 1, plan:'FREE'}), seats: Number(e.target.value)||1 }))} /></Form.Group></Col>
          </Row>
          <div className="mt-2"><Button variant="dark" onClick={async ()=>{ try { if (subscription) { await updateSubscription({ plan: subscription.plan, seats: subscription.seats }); setToast({ show:true, message:'Sottoscrizione aggiornata', variant:'success' }); } } catch { setToast({ show:true, message:'Errore salvataggio', variant:'danger' }); } }}>Salva sottoscrizione</Button></div>
        </Form>
      </section>

      <section>
        <h6 className="mb-3">Metodo di pagamento</h6>
        <Form>
          <Row className="g-2">
            <Col md={6}><Form.Group><Form.Label>Carta</Form.Label><Form.Control disabled value={payment ? `${payment.brand || ''} •••• ${payment.last4 || ''}` : ''} /></Form.Group></Col>
            <Col md={6}><Form.Group><Form.Label>Scadenza</Form.Label><Form.Control disabled value={payment ? `${payment.expMonth || ''}/${payment.expYear || ''}` : ''} /></Form.Group></Col>
          </Row>
          <div className="mt-2"><Button variant="outline-secondary" onClick={async ()=>{ try { await updatePaymentMethod({}); setToast({ show:true, message:'Metodo aggiornato', variant:'success' }); } catch { setToast({ show:true, message:'Errore aggiornamento', variant:'danger' }); } }}>Aggiorna metodo</Button></div>
        </Form>
      </section>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.variant} onClose={() => setToast({ ...toast, show: false })} show={toast.show} autohide delay={2500}>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}

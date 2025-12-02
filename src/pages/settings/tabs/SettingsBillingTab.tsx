import { useEffect, useState } from 'react';
import { Button, Col, Form, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import {
  getBillingProfile,
  updateBillingProfile,
  getSubscription,
  type BillingProfile,
  type Subscription,
  createCheckoutSession,
  createPortalSession,
} from '@/lib/settings.service';

export default function SettingsBillingTab() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalHint, setPortalHint] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    variant: 'success' | 'danger' | 'primary';
  }>({ show: false, message: '', variant: 'primary' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, s] = await Promise.all([
          getBillingProfile().catch(() => null),
          getSubscription().catch(() => null),
        ]);
        setProfile(p);
        setSubscription(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner animation="border" size="sm" />;

  const defaultProfile: BillingProfile = {
    companyName: '',
    taxId: '',
    address: '',
    zip: '',
    city: '',
    province: '',
    country: '',
    billingEmail: '',
    billingPec: '',
    billingSdiCode: '',
  };

  const subStatus = (subscription?.status || '').toUpperCase();
  const canCheckout = !subStatus || ['PENDING_PAYMENT', 'EXPIRED', 'CANCELED'].includes(subStatus);
  const nextBillingRaw = (subscription as any)?.nextBillingAt || (subscription as any)?.nextBillingOn || (subscription as any)?.nextInvoiceAt;
  const nextBillingFmt = formatDate(nextBillingRaw);

  const openPortal = async () => {
    try {
      setPortalLoading(true);
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setToast({
        show: true,
        message: 'Errore apertura Portal Stripe',
        variant: 'danger',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const openCheckout = async () => {
    try {
      setCheckoutLoading(true);
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || 'Errore creazione Checkout Stripe';
      setToast({ show: true, message, variant: 'danger' });
      if (status === 400) {
        setPortalHint(true);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section>
        <h6 className="mb-3">Profilo fatturazione</h6>
        <Form>
          <Row className="g-2">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Ragione sociale</Form.Label>
                <Form.Control
                  value={profile?.companyName || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...(p || defaultProfile), companyName: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Partita IVA / CF</Form.Label>
                <Form.Control
                  value={profile?.taxId || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...(p || defaultProfile), taxId: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Paese</Form.Label>
                <Form.Control
                  value={profile?.country || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...(p || defaultProfile), country: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Città</Form.Label>
                <Form.Control
                  value={profile?.city || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...(p || defaultProfile), city: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>CAP</Form.Label>
                <Form.Control
                  value={profile?.zip || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...(p || defaultProfile), zip: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group>
                <Form.Label>Indirizzo</Form.Label>
                <Form.Control
                  value={profile?.address || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...(p || defaultProfile), address: e.target.value }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Email fatture</Form.Label>
                <Form.Control
                  type="email"
                  value={profile?.billingEmail || ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...(p || defaultProfile),
                      billingEmail: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>PEC</Form.Label>
                <Form.Control
                  placeholder="pec@pec.it"
                  value={profile?.billingPec || ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...(p || defaultProfile),
                      billingPec: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Codice SDI</Form.Label>
                <Form.Control
                  placeholder="AAAAAAA"
                  value={profile?.billingSdiCode || ''}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...(p || defaultProfile),
                      billingSdiCode: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="mt-2">
            <Button
              variant="dark"
              onClick={async () => {
                try {
                  if (profile) {
                    await updateBillingProfile(profile);
                    setToast({ show: true, message: 'Profilo aggiornato', variant: 'success' });
                  }
                } catch {
                  setToast({
                    show: true,
                    message: 'Errore salvataggio',
                    variant: 'danger',
                  });
                }
              }}
            >
              Salva profilo
            </Button>
          </div>
        </Form>
      </section>

      <section>
        <h6 className="mb-3">Sottoscrizione</h6>
        {subscription && !(subscription as any).__featureDisabled ? (
          <div>
            <p><strong>Piano:</strong> {subscription.plan}</p>
            <p><strong>Ciclo:</strong> {subscription.cycle}</p>
            <p><strong>Stato:</strong> {subscription.status}</p>
            <p><strong>Inizio:</strong> {subscription.startsAt || '-'}</p>
            <p><strong>Prossima fatturazione:</strong> {nextBillingFmt}</p>

            <div className="mt-2 d-flex gap-2 flex-wrap">
              {canCheckout && (
                <Button
                  variant="primary"
                  disabled={checkoutLoading}
                  onClick={openCheckout}
                >
                  {checkoutLoading ? 'Reindirizzamento...' : 'Attiva / Riattiva abbonamento'}
                </Button>
              )}

              {(!subscription || !(subscription as any).__featureDisabled) && (
                <Button
                  variant={canCheckout ? 'outline-primary' : 'primary'}
                  disabled={portalLoading}
                  onClick={openPortal}
                >
                  {portalLoading ? 'Apertura...' : 'Gestisci abbonamento'}
                </Button>
              )}
            </div>

            {portalHint && (
              <div className="alert alert-warning mt-2 d-flex align-items-center justify-content-between flex-wrap">
                <div className="me-2 mb-1 mb-md-0">
                  Hai già un abbonamento attivo o in rinnovo: gestisci pagamenti e fatture dal Customer Portal.
                </div>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="outline-dark" onClick={openPortal} disabled={portalLoading}>
                    {portalLoading ? 'Apertura...' : 'Apri portal'}
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => setPortalHint(false)}>
                    Nascondi
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted mb-0">Nessuna sottoscrizione attiva.</p>
        )}
      </section>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg={toast.variant}
          onClose={() => setToast({ ...toast, show: false })}
          show={toast.show}
          autohide
          delay={2500}
        >
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}

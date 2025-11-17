import { useEffect, useState } from 'react';
import { Button, Col, Form, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import {
  getBillingProfile,
  updateBillingProfile,
  getSubscription,
  getPaymentMethod,
  updatePaymentMethod,
  type BillingProfile,
  type Subscription,
  type PaymentMethod,
} from '@/lib/settings.service';

export default function SettingsBillingTab() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    variant: 'success' | 'danger' | 'primary';
  }>({ show: false, message: '', variant: 'primary' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, s, pm] = await Promise.all([
          getBillingProfile().catch(() => null),
          getSubscription().catch(() => null),
          getPaymentMethod().catch(() => null),
        ]);
        setProfile(p);
        setSubscription(s);
        setPayment(pm);
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
  };

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
            <p>
              <strong>Piano:</strong> {subscription.plan}
            </p>
            <p>
              <strong>Ciclo:</strong> {subscription.cycle}
            </p>
            <p>
              <strong>Stato:</strong> {subscription.status}
            </p>
            <p>
              <strong>Inizio:</strong> {subscription.startsAt || '-'}
            </p>
            <p>
              <strong>Prossima fatturazione:</strong> {subscription.nextBillingAt || '-'}
            </p>
          </div>
        ) : (
          <p className="text-muted mb-0">Nessuna sottoscrizione attiva.</p>
        )}
      </section>

      <section>
        <h6 className="mb-3">Metodo di pagamento</h6>
        <Form>
          <Row className="g-2">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Metodo</Form.Label>
                <Form.Select
                  value={payment?.type || 'CARTA'}
                  onChange={(e) =>
                    setPayment((p) => ({
                      ...(p || { type: 'CARTA', masked: '**** **** **** 1234' }),
                      type: e.target.value as PaymentMethod['type'],
                    }))
                  }
                >
                  <option value="CARTA">Carta</option>
                  <option value="BONIFICO">Bonifico</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Riferimento</Form.Label>
                <Form.Control
                  value={payment?.masked || '**** **** **** 1234'}
                  onChange={(e) =>
                    setPayment((p) => ({
                      ...(p || { type: 'CARTA', masked: '**** **** **** 1234' }),
                      masked: e.target.value,
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
                  const payload: PaymentMethod =
                    payment || ({ type: 'CARTA', masked: '**** **** **** 1234' } as PaymentMethod);
                  await updatePaymentMethod(payload);
                  setToast({ show: true, message: 'Metodo aggiornato', variant: 'success' });
                } catch {
                  setToast({
                    show: true,
                    message: 'Errore aggiornamento',
                    variant: 'danger',
                  });
                }
              }}
            >
              Salva metodo
            </Button>
          </div>
        </Form>
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


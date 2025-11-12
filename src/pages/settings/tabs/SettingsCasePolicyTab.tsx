import { useEffect, useState } from 'react';
import { Col, Form, Row, Spinner } from 'react-bootstrap';
import { getCasePolicy, type CasePolicy } from '@/lib/settings.service';

export default function SettingsCasePolicyTab() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<CasePolicy>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await getCasePolicy();
        setPolicy(p || {});
      } catch {
        setPolicy({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner animation="border" size="sm" />;

  return (
    <div>
      <h6 className="mb-3">Policy &amp; Info</h6>

      {/* Cataloghi modulo pubblico (nota informativa) */}
      <section className="mb-4">
        <h6 className="mb-2">Cataloghi modulo pubblico</h6>
        <div className="text-muted">
          Il modulo pubblico usa i cataloghi del tenant definiti in <strong>Impostazioni &gt; Reparti</strong> e <strong>Impostazioni &gt; Categorie</strong>.
          La visibilità delle voci (mostra/nascondi) viene gestita in quelle sezioni.
        </div>
      </section>

      {/* Impostazioni di sistema (read-only) */}
      <section className="mb-4">
        <h6 className="mb-2">Impostazioni di sistema</h6>
        <Row className="g-3">
          <Col md={6}>
            <Form.Check
              type="switch"
              label="Restrizione visibilità per team assegnati"
              checked={!!policy.restrictVisibility}
              disabled
              readOnly
            />
          </Col>
          <Col md={6}>
            <Form.Check
              type="switch"
              label="Redazione automatica PII"
              checked={!!policy.redactPii}
              disabled
              readOnly
            />
          </Col>
          <Col md={6}>
            <Form.Check
              type="switch"
              label="Consenti allegati"
              checked={!!policy.allowAttachments}
              disabled
              readOnly
            />
            <div className="form-text">Gestito a livello di sistema: limiti e MIME (es. PNG, JPEG, PDF, TXT, MP3, WAV).</div>
          </Col>
        </Row>
      </section>

      <section className="mb-4">
        <h6 className="mb-2">Visibilità e ruoli</h6>
        <ul>
          <li>Agent: vede i casi solo se assegnatario o con permesso canViewAllCases</li>
          <li>Auditor: vede solo i casi in cui è assegnato come auditor</li>
          <li>Admin: piena visibilità</li>
        </ul>
      </section>

      <section className="mb-4">
        <h6 className="mb-2">Assegnazione e flusso</h6>
        <ul>
          <li>Auto‑assign "FIRST_VIEW" per ADMIN/AGENT alla prima apertura del caso</li>
          <li>L’auditor si assegna con POST /:id/auditors</li>
        </ul>
      </section>

      <section className="mb-4">
        <h6 className="mb-2">SLA e scadenze</h6>
        <ul>
          <li>Durate operative interne: OPEN 7 giorni, IN_PROGRESS 14 giorni</li>
          <li>Due date di risposta: tipicamente 90 giorni</li>
        </ul>
      </section>

      <section className="mb-4">
        <h6 className="mb-2">Privacy</h6>
        <ul>
          <li>Redazione PII per auditor sempre attiva</li>
          <li>Download allegati non consentito all’auditor (solo anteprima)</li>
        </ul>
      </section>

      <section>
        <h6 className="mb-2">Logging</h6>
        <ul>
          <li>Tracciamento accessi/azioni sul caso (access log)</li>
        </ul>
      </section>
    </div>
  );
}


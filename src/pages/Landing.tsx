// src/pages/Landing.tsx
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import logo from "@/assets/logo-transparent-dark.png";
import brand from "@/assets/logo-superuser.svg";

export default function Landing() {
  return (
    <>
      <section className="page-hero mb-4">
        <Container>
          <Row className="align-items-center g-4">
            <Col md={7}>
              <div className="eyebrow">Piattaforma di whistleblowing</div>
              <h1 className="fw-bold mb-2">Gestisci le segnalazioni con sicurezza enterprise</h1>
              <p className="text-secondary mb-4">
                Raccolta, revisione e audit delle segnalazioni interne con percorsi guidati, MFA e controlli di accesso.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Button href="#/register" variant="dark" className="rounded-pill px-4">
                  Inizia ora
                </Button>
                <Button href="#/login" variant="outline-dark" className="rounded-pill px-4">
                  Accedi
                </Button>
                <span className="badge-soft">SaaS sicuro • Cloud EU</span>
              </div>
            </Col>
            <Col md={5}>
              <Card className="info-card h-100">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <img src={brand} alt="LetMeKnow" width={24} height={24} />
                    <span className="label-muted">Console</span>
                  </div>
                  <div className="mb-3">
                    <div className="fw-semibold">Percorso guidato per segnalazioni</div>
                    <div className="text-secondary small">
                      Workflow strutturati, assegnazioni e reminder automatici.
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    <div className="metric-pill">
                      <span className="text-success">●</span>
                      <span>Accessi protetti</span>
                      <strong>MFA</strong>
                    </div>
                    <div className="metric-pill">
                      <span className="text-primary">●</span>
                      <span>Audit trail</span>
                      <strong>Completo</strong>
                    </div>
                    <div className="metric-pill">
                      <span className="text-warning">●</span>
                      <span>Segnalazioni attive</span>
                      <strong>Illimitate</strong>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="mb-4">
        <Container>
          <Row className="g-3">
            <Col md={6}>
              <Card className="info-card h-100">
                <Card.Body>
                  <div className="eyebrow">Conformita</div>
                  <h5 className="mb-2">Riservatezza end-to-end</h5>
                  <p className="text-secondary">
                    Crittografia, controlli di ruolo e canali separati per gestire whistleblowing in modo sicuro.
                  </p>
                  <ul className="mb-0 text-secondary small">
                    <li>Gestione ruoli e permessi granulari</li>
                    <li>Log audit e monitoraggio accessi</li>
                    <li>Notifiche mirate e filtri avanzati</li>
                  </ul>
                  <a
                    href="https://www.anticorruzione.it/-/whistleblowing"
                    target="_blank"
                    rel="noreferrer"
                    className="small link-primary d-inline-block mt-2"
                  >
                    Consulta la normativa ANAC sul whistleblowing
                  </a>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="info-card h-100">
                <Card.Body>
                  <div className="eyebrow">Attivazione rapida</div>
                  <h5 className="mb-2">Onboarding in pochi minuti</h5>
                  <p className="text-secondary">
                    Registrazione, attivazione owner e setup MFA direttamente dal portale pubblico.
                  </p>
                  <div className="d-flex align-items-center gap-2">
                    <img src={logo} alt="LetMeKnow" height={40} />
                    <span className="label-muted">Cloud ready</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      <footer className="pb-4">
        <Container>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 text-secondary small">
            <span>&copy; {new Date().getFullYear()} LetMeKnow</span>
            <div className="d-flex align-items-center gap-3">
              <a href="#/" className="text-decoration-none">Informazioni</a>
              <a href="#/" className="text-decoration-none">Contatti</a>
              <a href="#/" className="text-decoration-none">Documentazione</a>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
}

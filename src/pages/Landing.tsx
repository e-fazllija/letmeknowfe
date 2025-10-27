// src/pages/Landing.tsx
import { Container, Navbar, Nav, Button } from "react-bootstrap";
import logo from "../assets/logo-transparent-light.png";

export default function Landing() {
  return (
    <>
      {/* Header pubblico con Accedi / Registrati */}
      <Navbar bg="light" expand="md" className="border-bottom py-3">
        <Container>
          <Navbar.Brand href="#/" className="d-flex align-items-center">
            <img
              src={logo}
              alt="LetMeKnow"
              style={{
                height: 64, // 🔹 logo grande
                width: "auto",
                maxHeight: "70px",
                display: "block",
              }}
            />
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="landing-nav" />
          <Navbar.Collapse id="landing-nav" className="justify-content-end">
            <Nav className="align-items-center gap-2">
              <Nav.Link href="#/login">Accedi</Nav.Link>
              <Button href="#/register" variant="dark" size="sm">
                Registrati
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero minimale */}
      <section className="py-5 bg-white">
        <Container>
          <div className="row justify-content-center text-center">
            <div className="col-12 col-lg-10">
              <h1 className="mb-3">Piattaforma di whistleblowing</h1>
              <p className="text-muted mb-4">
                Area pubblica in attesa dei contenuti marketing. Testo segnaposto.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <Button href="#/register" variant="dark">
                  Inizia ora
                </Button>
                <Button href="#/login" variant="outline-dark">
                  Accedi
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing: singolo piano centrale (placeholder) */}
      <section className="py-5 border-top">
        <Container>
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-sm">
                <div className="card-body p-4">
                  <div className="text-center mb-3">
                    <h4 className="mb-1">Piano Base</h4>
                    <div className="text-muted small">
                      Sezione prezzi segnaposto. Contenuti definitivi verranno inseriti dal team marketing.
                    </div>
                  </div>

                  <ul className="list-group list-group-flush mb-4">
                    <li className="list-group-item">Segnalazioni illimitate (mock)</li>
                    <li className="list-group-item">Gestione stato, gravità, scadenze</li>
                    <li className="list-group-item">Note interne e messaggi pubblici</li>
                    <li className="list-group-item">Esporti/Import da widget (dev)</li>
                  </ul>

                  <div className="d-grid gap-2">
                    <Button href="#/register" variant="dark">
                      Prosegui con la registrazione
                    </Button>
                    <Button href="#/login" variant="outline-dark">
                      Accedi se sei già cliente
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-center text-muted small mt-3">
                Ulteriori piani o opzioni verranno aggiunti qui.
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer minimale */}
      <footer className="py-4 border-top">
        <Container>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <div className="text-muted small">© {new Date().getFullYear()} LetMeKnow</div>
            <div className="d-flex align-items-center gap-3 small">
              <a href="#/" className="text-decoration-none">
                Informazioni
              </a>
              <a href="#/" className="text-decoration-none">
                Contatti
              </a>
              <a href="#/" className="text-decoration-none">
                Documentazione
              </a>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
}

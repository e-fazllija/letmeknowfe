import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Dropdown from "react-bootstrap/Dropdown";
import Sidebar from "../components/Sidebar";
import { useAuth, isAuditor } from "../context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import NotificationBell from "@/components/common/NotificationBell";

export function UserBadge() {
  const auth: any = useAuth();
  const email: string = auth?.user?.email ?? "?";
  const role: string = auth?.user?.role ?? "?"; // BE manda minuscolo
  return <span>{email} � {role}</span>;
}

export function PrivateLayout() {
  const auth: any = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    try {
      if (typeof auth?.logout === "function") {
        auth.logout();
        return;
      }
      if (typeof auth?.signOut === "function") {
        auth.signOut();
        return;
      }
    } catch {}
  }

  // Stili (layout: sidebar a sinistra full-height, navbar scura a destra)
  useEffect(() => {
    const css = `
      :root {
        --lmw-dark: #111827;
        --lmw-emerald-start: #0f172a;
        --lmw-emerald-end: #0f766e;
        --lmw-emerald-soft: #0d8a7e;
        --lmw-emerald-mid: #0f4743;
      }
      .lmw-shell { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
      @media (max-width: 991.98px) { .lmw-shell { grid-template-columns: 220px 1fr; } }
      @media (max-width: 767.98px) { .lmw-shell { grid-template-columns: 1fr; } }
      .lmw-sidebar {
        background:
          radial-gradient(circle at 18% 22%, rgba(226, 252, 247, 0.08), transparent 40%),
          linear-gradient(180deg, var(--lmw-emerald-start) 0%, var(--lmw-emerald-mid) 58%, var(--lmw-emerald-end) 100%);
        color: #fff;
        height: 100vh;
        position: sticky;
        top: 0;
        overflow: auto;
        padding: 1rem;
        box-shadow: 6px 0 24px rgba(15, 23, 42, 0.18);
      }
      .lmw-sidebar .nav-link { color:#dbeafe; font-weight:600; }
      .lmw-sidebar .nav-link:hover { color:#fff; }
      .lmw-sidebar .nav-link.active { color:#fff; background:rgba(255,255,255,.12); border-radius:.375rem; }
      .lmw-main { display:flex; flex-direction:column; min-height:100vh; background:#f8fafc; }
      .lmw-topbar {
        background:
          linear-gradient(135deg, var(--lmw-emerald-start) 0%, var(--lmw-emerald-end) 60%, var(--lmw-emerald-soft) 100%) !important;
        position: sticky;
        top: 0;
        z-index: 1040;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      }
      .lmw-content { flex:1 1 auto; padding:1rem; }
      @media (max-width: 767.98px) { .lmw-sidebar { height:auto; position:static; } }
    `;
    const tag = document.createElement("style");
    tag.setAttribute("data-lmw", "layout-css");
    tag.innerHTML = css;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  // Se il tenant ha appena completato la registrazione ma non ha ancora pagato,
  // forza la navigazione alla sezione Fatturazione.
  useEffect(() => {
    try {
      const flag = localStorage.getItem("lmw_after_signup_payment");
      if (flag === "1") {
        navigate("/settings?tab=billing", { replace: true });
      }
    } catch {
      // ignore
    }
  }, [navigate]);

  return (
    <NotificationsProvider>
      <div className="lmw-shell">
        {/* Colonna sinistra: sidebar fino in alto */}
        <aside className="lmw-sidebar">
          <Sidebar />
        </aside>

        {/* Colonna destra: navbar in alto + contenuto sotto */}
        <section className="lmw-main">
          <Navbar expand="md" variant="dark" className="lmw-topbar shadow-sm">
            <Container fluid className="justify-content-end">
              <Nav className="align-items-center gap-3">
                <NotificationBell />
                <Dropdown align="end">
                  <Dropdown.Toggle
                    size="sm"
                    variant="outline-light"
                    id="dropdown-user"
                    className="text-light border-0"
                  >
                    {(() => {
                      const u = auth?.user;
                      const ready = Array.isArray(u?.permissions);
                      const email = ready ? u?.email ?? "?" : "?";
                      const role = ready ? u?.role ?? "?" : "?";
                      return <span>{email} - {role}</span>;
                    })()}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item href="#/settings?tab=account">
                      Profilo
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item as="button" onClick={handleLogout}>
                      Esci
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            </Container>
          </Navbar>

          {isAuditor(auth?.user) && (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: "#fff3cd",
                color: "#5c4c0b",
                padding: "8px 12px",
                borderBottom: "1px solid #f1e2a8",
              }}
            >
              <strong>Modalità Auditore - sola lettura</strong>
            </div>
          )}

          <div className="lmw-content">
            <Outlet />
          </div>
        </section>
      </div>
    </NotificationsProvider>
  );
}


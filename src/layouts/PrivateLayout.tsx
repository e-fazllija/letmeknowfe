import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Dropdown from "react-bootstrap/Dropdown";
import Sidebar from "../components/Sidebar";
import { useAuth, isAuditor } from "../context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import NotificationBell from "@/components/common/NotificationBell";
import { getBillingStatus, type BillingStatus } from "@/lib/settings.service";

export function UserBadge() {
  const auth: any = useAuth();
  const email: string = auth?.user?.email ?? "?";
  const role: string = auth?.user?.role ?? "?"; // BE manda minuscolo
  return <span>{email} � {role}</span>;
}

export function PrivateLayout() {
  const auth: any = useAuth();
  const navigate = useNavigate();
  const [billingLock, setBillingLock] = useState<{
    message: string;
    lastPaymentStatus?: string | null;
  } | null>(null);

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
        --lmw-emerald-start: #ffffff;
        --lmw-emerald-mid: #eef2fb;
        --lmw-emerald-end: #d9e0f4;
        --lmw-emerald-soft: #24315f;
        --lmw-sidebar-w: 260px;
        --lmw-topbar-h: 78px;
        --lmw-bg-gradient: linear-gradient(180deg, #f8f9ff 0%, #eef2fb 52%, #d9e0f4 100%);
        --lmw-topbar-bg: linear-gradient(90deg, #f8f9ff 0%, #eef2fb 45%, #d9e0f4 100%);
      }
      .lmw-shell { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
      @media (max-width: 991.98px) { .lmw-shell { grid-template-columns: 220px 1fr; } :root { --lmw-sidebar-w: 220px; } }
      @media (max-width: 767.98px) { .lmw-shell { grid-template-columns: 1fr; } }
      .lmw-sidebar {
        isolation: isolate;
        background: var(--lmw-bg-gradient);
        color: var(--lmw-emerald-soft);
        height: 100vh;
        position: sticky;
        top: 0;
        overflow: auto;
        padding: 1rem;
        margin-top: -1px;
        padding-top: calc(1rem + 1px);
        box-shadow: none;
        background-repeat: no-repeat;
      }
      /* Extend the topbar gradient behind the sidebar logo area (no seam). */
      .lmw-sidebar::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: calc(var(--lmw-topbar-h) + 2px);
        background: var(--lmw-topbar-bg);
        background-position: 0 0;
        background-size: 100vw var(--lmw-topbar-h);
        border-bottom: none;
        box-shadow: none;
        pointer-events: none;
        z-index: 0;
      }
      .lmw-sidebar > * { position: relative; z-index: 1; }
      .lmw-sidebar .nav-link {
        color: var(--lmw-emerald-soft);
        font-weight:600;
        background: rgba(255, 255, 255, 0.62);
        border: 1px solid rgba(36, 49, 95, 0.12);
        border-radius:.5rem;
      }
      .lmw-sidebar .nav-link:hover {
        color: var(--lmw-emerald-soft);
        background: rgba(255, 255, 255, 0.78);
        border-color: rgba(36, 49, 95, 0.18);
      }
      .lmw-sidebar .nav-link.active {
        color: #f08010;
        background: rgba(255, 255, 255, 0.90);
        border-color: rgba(240, 128, 16, 0.55);
        box-shadow: 0 10px 18px rgba(15, 23, 42, 0.10);
      }
      .lmw-main {
        display:flex;
        flex-direction:column;
        min-height:100vh;
        background: var(--lmw-bg-gradient);
        --bs-card-bg: rgba(var(--bs-secondary-rgb), 0.16);
        --bs-card-cap-bg: rgba(var(--bs-secondary-rgb), 0.22);
        --bs-card-border-color: rgba(var(--bs-primary-rgb), 0.10);
      }
      .lmw-main .card-header.bg-white { background: var(--bs-card-cap-bg) !important; }
      .lmw-main .card {
        background: var(--bs-card-bg);
        border-color: var(--bs-card-border-color);
      }
      .lmw-main .card-header {
        background: var(--bs-card-cap-bg);
        border-color: var(--bs-card-border-color);
      }
      .lmw-main .info-card,
      .lmw-main .filter-card,
      .lmw-main .table-card {
        background: rgba(var(--bs-secondary-rgb), 0.16);
        border-color: rgba(var(--bs-primary-rgb), 0.10);
      }
      .lmw-topbar {
        background: var(--lmw-topbar-bg) !important;
        /* align the gradient with the sidebar (same 100vw canvas) */
        background-position: calc(-1 * var(--lmw-sidebar-w)) 0 !important;
        background-size: 100vw var(--lmw-topbar-h) !important;
        position: sticky;
        top: 0;
        z-index: 1040;
        box-shadow: none;
        border-bottom: none;
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

  // Billing lock globale: chiama GET /tenant/billing/status all'avvio
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = (await getBillingStatus().catch(() => null)) as BillingStatus | null;
        if (!status || cancelled) return;

        const locked = !!status.billingLocked;
        const clientStatus = String(status.clientStatus || "").toUpperCase();
        const message =
          status.lockMessage ||
          (locked
            ? clientStatus === "SUSPENDED"
              ? "Account sospeso per mancato pagamento."
              : clientStatus === "PENDING_PAYMENT"
              ? "Completa il pagamento per attivare l'account."
              : clientStatus === "ARCHIVED"
              ? "Account archiviato: contatta il supporto per maggiori dettagli."
              : "Accesso limitato: completa il pagamento."
            : "");

        if (locked && message) {
          setBillingLock({
            message,
            lastPaymentStatus: status.lastPaymentStatus ?? null,
          });
          try {
            sessionStorage.setItem("lmw_billing_lock_msg", message);
          } catch {
            // ignore
          }
        } else {
          setBillingLock(null);
          try {
            sessionStorage.removeItem("lmw_billing_lock_msg");
          } catch {
            // ignore
          }
        }
      } catch {
        // fallback: 403 interceptor / login continueranno a gestire eventuali lock
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <NotificationsProvider>
      <div className="lmw-shell">
        {/* Colonna sinistra: sidebar fino in alto */}
        <aside className="lmw-sidebar">
          <Sidebar />
        </aside>

        {/* Colonna destra: navbar in alto + contenuto sotto */}
        <section className="lmw-main">
          <Navbar expand="md" variant="light" className="lmw-topbar shadow-sm">
            <Container fluid className="justify-content-end">
              <Nav className="align-items-center gap-3">
                <NotificationBell />
                <Dropdown align="end">
                  <Dropdown.Toggle
                    size="sm"
                    variant="outline-dark"
                    id="dropdown-user"
                    className="text-dark border-0"
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

          {billingLock && (
            <div
              role="status"
              aria-live="polite"
              className={
                "mb-0 alert " +
                (billingLock.lastPaymentStatus === "FAILED" ? "alert-danger" : "alert-warning")
              }
              style={{ borderRadius: 0 }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span>{billingLock.message}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => navigate("/settings?tab=billing")}
                >
                  Vai a fatturazione
                </button>
              </div>
            </div>
          )}

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


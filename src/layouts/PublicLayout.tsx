import { Outlet, useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import logo from "@/assets/logo-superuser.svg";

/** Layout PUBBLICO: nessuna navbar utente; header con CTA */
export function PublicLayout() {
  const navigate = useNavigate();

  const goLogin = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); navigate("/login"); };
  const publicSignupUrl = (import.meta as any).env?.VITE_PUBLIC_SIGNUP_URL || `${(import.meta as any).env?.VITE_API_BASE_URL}/public`;
  const goRegister = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (publicSignupUrl) navigate("/register");
  };

  return (
    <div className="min-vh-100">
      <header className="app-header">
        <div className="container header-bar">
          <a href="#/" className="brand-link">
            <div className="brand-avatar">
              <img src={logo} alt="LetMeKnow" width={28} height={28} />
            </div>
            <div className="lh-sm">
              <div className="brand-eyebrow">Piattaforma</div>
              <div className="brand-title">LetMeKnow</div>
            </div>
          </a>
          <div className="d-flex align-items-center gap-2">
            <Button type="button" variant="outline-dark" className="rounded-pill" onClick={goRegister}>
              Registrati
            </Button>
            <Button type="button" variant="dark" className="rounded-pill px-3" onClick={goLogin}>
              Accedi
            </Button>
          </div>
        </div>
      </header>
      <main className="container page-shell">
        <Outlet />
      </main>
    </div>
  );
}

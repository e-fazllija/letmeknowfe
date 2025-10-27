import { Outlet, useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";

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
    <div className="bg-light min-vh-100">
      <header className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white">
        <div className="fw-bold">LetMeKnow</div>
        <div className="d-flex gap-2">
          <Button type="button" variant="dark" onClick={goLogin}>Accedi</Button>
          <Button type="button" variant="outline-secondary" onClick={goRegister}>Registrati</Button>
        </div>
      </header>
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}


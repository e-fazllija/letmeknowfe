import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logout();
    } catch {}
    navigate("/logout", { replace: true });
  };

  // Navbar visibile solo dopo l'accesso (layout privato)
  return (
    <Navbar bg="dark" data-bs-theme="dark" className="border-bottom">
      <Container className="justify-content-end">
        <div className="d-flex align-items-center gap-3">
          <span className="navbar-text">
            {user?.email} · <span className="text-secondary">{user?.role}</span>
          </span>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
          >
            Esci
          </button>
        </div>
      </Container>
    </Navbar>
  );
}

// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";
import logo from "../assets/logo-transparent-dark.png"; // usa il tuo file in /src/assets

export default function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "list-group-item list-group-item-action" + (isActive ? " active" : "");

  return (
    <aside className="sidebar border-end">
      {/* SOLO LOGO — grande, centrato e LARGO */}
      <div className="d-flex justify-content-center align-items-center py-4 border-bottom">
        <NavLink to="/new/text" className="text-decoration-none" title="Nuova segnalazione">
          <img
            src={logo}
            alt="LetMeKnow"
            className="sidebar-logo"
          />
        </NavLink>
      </div>

      {/* Navigazione */}
      <nav className="list-group list-group-flush" aria-label="Navigazione widget">
        <NavLink to="/new/text" className={linkClass} end>
          Nuova segnalazione
        </NavLink>
        <NavLink to="/case/access" className={linkClass}>
          Accedi a pratica
        </NavLink>
        <NavLink to="/anac" className={linkClass}>
          Canale ANAC
        </NavLink>
      </nav>
    </aside>
  );
}

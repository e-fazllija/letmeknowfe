import { NavLink } from "react-router-dom";

type Props = {
  logoSrc?: string;
  title?: string;
};

export default function Sidebar({ logoSrc, title = "LetMeKnow" }: Props) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "list-group-item list-group-item-action" + (isActive ? " active" : "");

  return (
    <aside className="sidebar border-end">
      <div className="d-flex justify-content-center align-items-center py-4 border-bottom">
        <NavLink to="/new/text" className="text-decoration-none" title="Nuova segnalazione">
          {logoSrc ? (
            <img src={logoSrc} alt={title} className="sidebar-logo" />
          ) : (
            <span className="fs-5 fw-bold text-white">{title}</span>
          )}
        </NavLink>
      </div>

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


import { NavLink } from "react-router-dom";

type Props = {
  logoSrc?: string;
  title?: string;
};

export default function Sidebar({ logoSrc, title = "LetMeKnow" }: Props) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "list-group-item list-group-item-action" + (isActive ? " active" : "");

  return (
    <aside className="sidebar">
      <div className="mb-4 text-center px-3 pt-4">
        <NavLink
          to="/new/text"
          className="d-inline-flex align-items-center text-decoration-none w-100 justify-content-center"
          title="Nuova segnalazione"
        >
          {logoSrc ? (
            <img src={logoSrc} alt={title} className="sidebar-logo-main" />
          ) : (
            <span className="fs-5 fw-bold">{title}</span>
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

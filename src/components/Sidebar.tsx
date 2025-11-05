import Nav from "react-bootstrap/Nav";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo-transparent-dark.png";

export default function Sidebar() {
  const { has } = useAuth();

  return (
    <div>
      {/* Logo brand */}
      <div className="mb-4 text-center">
        <NavLink
          to="/home"
          className="d-inline-flex align-items-center text-decoration-none"
        >
          <img
            src={logo}
            alt="LetMeKnow"
            style={{ height: 140, width: "auto" }}
          />
        </NavLink>
      </div>

      <Nav className="flex-column gap-1">
        <Nav.Link as={NavLink} to="/home" end>
          🏠 Home
        </Nav.Link>

        {has("REPORT_CREATE") && (
          <Nav.Link as={NavLink} to="/new">
            ✍️ Nuova segnalazione
          </Nav.Link>
        )}

        {has("REPORTS_VIEW") && (
          <Nav.Link as={NavLink} to="/reports">
            📋 Segnalazioni
          </Nav.Link>
        )}

        {/* Archivio rimosso dalla sidebar su richiesta */}

        {/* Sempre visibile */}
        <Nav.Link as={NavLink} to="/settings">
          ⚙️ Impostazioni
        </Nav.Link>
      </Nav>
    </div>
  );
}


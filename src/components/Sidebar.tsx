import Nav from "react-bootstrap/Nav";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/Logo_Letmeknow_Scritta_Sotto_Scuro.png";

export default function Sidebar() {
  const { has } = useAuth();

  const billingOnly = (() => {
    try {
      return localStorage.getItem("lmw_after_signup_payment") === "1";
    } catch {
      return false;
    }
  })();

  return (
    <div>
      {/* Logo brand */}
      <div className="mb-4 text-center">
        <NavLink
          to="/home"
          className="d-inline-flex align-items-center text-decoration-none w-100 justify-content-center"
        >
          <img
            src={logo}
            alt="LetMeKnow"
            className="sidebar-logo-main"
          />
        </NavLink>
      </div>

      <Nav className="flex-column gap-1">
        {!billingOnly && (
          <>
            <Nav.Link as={NavLink} to="/home" end>
              Home
            </Nav.Link>

            {has("REPORT_CREATE") && (
              <Nav.Link as={NavLink} to="/new">
                Nuova segnalazione
              </Nav.Link>
            )}

            {has("REPORTS_VIEW") && (
              <Nav.Link as={NavLink} to="/reports">
                Segnalazioni
              </Nav.Link>
            )}
          </>
        )}

        {/* Sempre visibile */}
        <Nav.Link as={NavLink} to="/settings">
          Impostazioni
        </Nav.Link>
      </Nav>
    </div>
  );
}

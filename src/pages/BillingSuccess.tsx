import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      // eslint-disable-next-line no-console
      console.info("Stripe Checkout session completata:", sessionId);
    }
    // Pagamento completato: rimuovi il flag che forza la sezione Billing
    try {
      localStorage.removeItem("lmw_after_signup_payment");
      localStorage.removeItem("lmw_autocheckout");
    } catch {
      // ignore
    }
    // Dopo aver pulito il flag, porta l'utente alla home
    navigate("/home", { replace: true });
  }, [location.search, navigate]);

  return (
    <div className="container py-5">
      <h3 className="mb-3">Pagamento completato</h3>
      <p className="mb-4">
        Il tuo piano è stato attivato correttamente. Puoi gestire il pagamento e le fatture
        dalla sezione <strong>Impostazioni &gt; Billing</strong>.
      </p>
      <button
        type="button"
        className="btn btn-primary me-2"
        onClick={() => navigate("/settings")}
      >
        Torna alle impostazioni
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => navigate("/home")}
      >
        Vai alla dashboard
      </button>
    </div>
  );
}

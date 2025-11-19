import { useNavigate } from "react-router-dom";

export default function BillingCanceled() {
  const navigate = useNavigate();

  return (
    <div className="container py-5">
      <h3 className="mb-3">Pagamento annullato</h3>
      <p className="mb-4">
        Hai annullato la procedura di pagamento su Stripe. Nessuna modifica è stata applicata al tuo piano.
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


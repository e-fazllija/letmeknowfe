// src/pages/MfaCode.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { completeMfa } from "@/lib/mfa.service";
import { useAuth } from "@/context/AuthContext";

type FrontendRole = "admin" | "user" | "superhost";

// mappa i ruoli BE -> FE
function mapRole(input: any): FrontendRole {
  const raw =
    String(
      input?.role ??
      (Array.isArray(input?.roles) ? input?.roles[0] : input?.roles) ??
      ""
    ).toUpperCase();

  if (raw === "ADMIN" || raw === "OWNER" || raw === "SUPERADMIN") return "admin";
  if (raw === "SUPERHOST") return "superhost";
  return "user"; // AGENT/USER/altro
}

export default function MfaCode() {
  const q = new URLSearchParams(useLocation().search);
  const mfaToken = q.get("token") || "";
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); // <— blocchiamo la validazione nativa
    setError(null);
    setOk(null);

    // validazione custom (evita blocchi del browser)
    const clean = (code || "").replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Inserisci un codice a 6 cifre.");
      return;
    }

    setLoading(true);
    try {
      // Prova il flusso del Context: aggiorna stato globale e naviga
      try {
        if (verifyOtp) {
          const okCtx = await verifyOtp(clean);
          if (okCtx) return;
        }
      } catch { /* fallback sotto */ }
      // Se il token non è passato via query, usa il fallback da sessionStorage
      const res = mfaToken
        ? await completeMfa(mfaToken, clean)
        : await completeMfa(clean);

      const email =
        localStorage.getItem("lmw_user_email") ||
        res?.user?.email ||
        "";

      const role = mapRole(res?.user);

      // salva tutto ciò che AuthContext/ProtectedRoute si aspetta
      try {
        if (res.accessToken) localStorage.setItem("lmw_token", res.accessToken);
        localStorage.setItem("lmw_user_role", role);
        if (email) localStorage.setItem("lmw_user_email", email);
        localStorage.setItem("letmeknow_auth", JSON.stringify({ email, role }));
      } catch {}

      setOk("Accesso completato. Reindirizzo…");
      setTimeout(() => navigate("/home", { replace: true }), 300);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Codice non valido o scaduto. Genera un nuovo codice e riprova."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 420 }}>
      <h3>Verifica OTP</h3>
      <p className="text-muted">Inserisci il codice a 6 cifre che ti abbiamo inviato via email.</p>

      {ok && <div className="alert alert-success">{ok}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* noValidate -> niente blocchi nativi del browser */}
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Codice</label>
          <input
            className="form-control"
            // niente pattern: gestiamo noi la validazione per evitare il blocco
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-dark w-100" disabled={loading}>
          {loading ? "Verifico…" : "Completa accesso"}
        </button>
      </form>
    </div>
  );
}


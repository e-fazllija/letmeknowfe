// src/pages/MfaComplete.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mfaComplete } from "@/lib/tenantAuth.service";

export default function MfaComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateToken = (location.state as any)?.mfaToken as string | undefined;
  const queryToken = new URLSearchParams(location.search).get("token") || undefined;
  const mfaToken = (stateToken || queryToken || "").trim();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null);
    const clean = code.replace(/\D/g, "");
    if (!mfaToken) { setError("Token MFA mancante o scaduto. Rifai il login."); return; }
    if (clean.length !== 6) { setError("Inserisci un codice a 6 cifre."); return; }
    setLoading(true);
    try {
      const res = await mfaComplete(mfaToken, clean);
      if ((res as any)?.accessToken) {
        setOk("Accesso completato. Reindirizzo…");
        setTimeout(() => navigate("/home", { replace: true }), 300);
      } else {
        setError("Risposta inattesa.");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Codice non valido o scaduto. Riprova.");
    } finally { setLoading(false); }
  }

  if (!mfaToken) {
    return (
      <div className="container py-4" style={{ maxWidth: 420 }}>
        <div className="alert alert-warning">Token MFA mancante. <a href="#/login">Torna al login</a>.</div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 420 }}>
      <h3>Completa l'accesso</h3>
      <p className="text-muted">Inserisci il codice a 6 cifre generato dalla tua app di autenticazione.</p>

      {ok && <div className="alert alert-success">{ok}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Codice</label>
          <div className="input-group">
            <input
              className="form-control"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-label="Codice MFA"
              aria-required="true"
              autoFocus
            />
            <button type="submit" className="btn btn-dark" disabled={loading}>
              {loading ? "Verifico…" : "Verifica"}
            </button>
          </div>
        </div>
        <a href="#/login" className="btn btn-outline-secondary w-100 mt-2">Torna al login</a>
      </form>
    </div>
  );
}


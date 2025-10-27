// src/pages/MfaVerify.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMfaToken } from "@/lib/api";
import { mfaVerify, mfaComplete } from "@/lib/mfa.api";

export default function MfaVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const setupToken = ((location.state as any)?.setupToken || qs.get("token") || "").trim();
  const stateMfaToken = (location.state as any)?.mfaToken as string | undefined;

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Guard: se non siamo in setup (no setupToken) e non c'è mfaToken,
  // invia a /home se già autenticato o /login altrimenti
  useEffect(() => {
    if (setupToken) return;
    const hasMfa = !!sessionStorage.getItem("lmw_mfa_token");
    const hasAccess = !!localStorage.getItem("lmw_token");
    if (!hasMfa) {
      if (hasAccess) navigate("/home", { replace: true });
      else navigate("/login", { replace: true });
    }
  }, [navigate, setupToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) {
      setErr("Inserisci un codice di 6 cifre.");
      return;
    }

    setLoading(true);
    try {
      const token = setupToken || stateMfaToken || getMfaToken() || "";
      await mfaVerify(token, clean);
      const res = await mfaComplete(token);
      const access = (res as any)?.accessToken;
      if (access) {
        try { localStorage.setItem("access_token", access); localStorage.setItem("lmw_token", access); } catch {}
        setOk("Accesso completato.");
        setTimeout(() => navigate("/home", { replace: true }), 300);
      } else {
        setErr("Risposta inattesa");
      }
    } catch (e: any) {
      if (e?.response?.status === 401) setErr("Codice non valido.");
      else setErr(e?.response?.data?.message || e?.message || "Codice non valido o scaduto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 420 }}>
      <h3>Verifica 2FA</h3>
      <p className="text-muted">Inserisci il codice a 6 cifre generato dall'app di autenticazione.</p>

      {err && <div className="alert alert-danger">{err}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Codice a 6 cifre</label>
          <input
            className="form-control"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </div>
        <button className="btn btn-dark w-100" disabled={loading}>
          {loading ? "Verifico..." : setupToken ? "Verifica e abilita" : "Verifica e accedi"}
        </button>
        <a href="#/login" className="btn btn-outline-secondary w-100 mt-2">
          Torna al login
        </a>
      </form>
    </div>
  );
}

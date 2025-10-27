// src/pages/Activate.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { activateAccount } from "@/lib/publicAuth.service";

export default function Activate() {
  const navigate = useNavigate();
  const q = new URLSearchParams(useLocation().search);
  const selector = (q.get("selector") || "").replace(/&+$/, "");
  const token = (q.get("token") || "").replace(/&+$/, "");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pwdRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selector || !token) {
      setErr("Link di attivazione non valido o incompleto.");
    }
  }, [selector, token]);

  function validate() {
    setPwdErr(null); setConfirmErr(null);
    if (!password || password.length < 8) { setPwdErr("La password deve avere almeno 8 caratteri."); return false; }
    if (confirm !== password) { setConfirmErr("Le password non coincidono."); return false; }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!validate()) {
      if (pwdErr && pwdRef.current) pwdRef.current.focus();
      else if (confirmErr && confirmRef.current) confirmRef.current.focus();
      return;
    }

    setLoading(true);
    try {
      await activateAccount({ selector, token, password });
      setMsg("Account attivato. Ora puoi effettuare il login.");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (e: any) {
      const status = e?.status || e?.response?.status;
      const message = e?.data?.message || e?.response?.data?.message || e?.message || "";
      if (status === 404) setErr("Link di attivazione non valido o scaduto. Richiedi un nuovo invito.");
      else if (status === 400) {
        if (/password/i.test(String(message)) || password.length < 8) setPwdErr("La password deve avere almeno 8 caratteri.");
        else setErr("Link di attivazione non valido o scaduto. Richiedi un nuovo invito.");
      } else setErr("Si è verificato un errore imprevisto. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 520 }}>
      <h3>Imposta la tua password</h3>
      <p className="text-muted">Completa l’attivazione dell’account impostando una nuova password.</p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="pwd">Password</label>
          <div className="input-group">
            <input
              id="pwd"
              className={`form-control ${pwdErr ? "is-invalid" : ""}`}
              type={showPwd ? "text" : "password"}
              ref={pwdRef}
              required
              minLength={8}
              maxLength={128}
              aria-invalid={!!pwdErr}
              aria-describedby={pwdErr ? "pwdHelp" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPwd((v) => !v)}>{showPwd ? "Nascondi" : "Mostra"}</button>
            {pwdErr && <div id="pwdHelp" className="invalid-feedback">{pwdErr}</div>}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="pwd2">Conferma password</label>
          <div className="input-group">
            <input
              id="pwd2"
              className={`form-control ${confirmErr ? "is-invalid" : ""}`}
              type={showConfirm ? "text" : "password"}
              ref={confirmRef}
              required
              minLength={8}
              maxLength={128}
              aria-invalid={!!confirmErr}
              aria-describedby={confirmErr ? "confirmHelp" : undefined}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? "Nascondi" : "Mostra"}</button>
            {confirmErr && <div id="confirmHelp" className="invalid-feedback">{confirmErr}</div>}
          </div>
        </div>

        <button
          className="btn btn-dark w-100"
          disabled={loading || !selector || !token || password.length < 8 || confirm !== password}
        >
          {loading ? "Conferma…" : "Conferma"}
        </button>
        <a href="#/login" className="btn btn-outline-secondary w-100 mt-2">Annulla</a>
      </form>
    </div>
  );
}


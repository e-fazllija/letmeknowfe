// src/pages/MfaSetup.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mfaSetup, mfaVerify } from "@/lib/tenantAuth.service";

export default function MfaSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const setupToken = (location.state as any)?.setupToken || new URLSearchParams(location.search).get("token");
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!setupToken) navigate("/login", { replace: true });
  }, [setupToken, navigate]);

  useEffect(() => {
    (async () => {
      if (!setupToken) return;
      try {
        const res = await mfaSetup(setupToken);
        setOtpauthUrl(res.otpauthUrl || "");
        setSecret(res.secret || "");
      } catch (e: any) {
        setErr(e?.response?.data?.message || e?.message || "Impossibile iniziare il setup MFA");
      }
    })();
  }, [setupToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null); if (!setupToken) return;
    const clean = code.replace(/\D/g, ""); if (clean.length !== 6) { setErr("Inserisci un codice di 6 cifre."); return; }
    setLoading(true);
    try {
      const res = await mfaVerify(setupToken, clean);
      const codes = (res?.recoveryCodes || []) as string[];
      setOk(codes && codes.length ? `MFA attivata. Salva i tuoi codici di recupero (tot: ${codes.length}).` : "MFA attivata con successo. Ora puoi effettuare il login.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Codice non valido, riprova.");
    } finally { setLoading(false); }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 540 }}>
      <div className="card p-4">
        <h3>Configura l’autenticazione a due fattori</h3>
        {err && <div className="alert alert-danger">{err}</div>}
        {ok && <div className="alert alert-success">{ok}</div>}
        <p className="text-muted">Scansiona il QR con la tua app TOTP oppure inserisci la chiave segreta manualmente, quindi digita il codice a 6 cifre.</p>
        {otpauthUrl && (
          <div className="text-center mb-3">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`} alt="QR" />
          </div>
        )}
        {secret && <div className="alert alert-secondary"><strong>Segreto:</strong> <code>{secret}</code></div>}
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Codice a 6 cifre</label>
            <input className="form-control" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" required />
          </div>
          <button className="btn btn-dark" disabled={loading || !setupToken}>{loading ? "Verifico…" : "Verifica"}</button>
          <a href="#/login" className="btn btn-outline-secondary ms-2">Vai al login</a>
        </form>
      </div>
    </div>
  );
}

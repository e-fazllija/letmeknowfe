import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type ConfirmState = {
  publicCode: string;
  secret: string;
};

export default function PublicConfirm() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: ConfirmState };
  const publicCode = location.state?.publicCode;
  const secret = location.state?.secret;
  const [saved, setSaved] = useState(false);
  const [copyOk, setCopyOk] = useState<string | null>(null);

  useEffect(() => {
    if (!publicCode || !secret) {
      navigate('/new/text', { replace: true });
    }
  }, [publicCode, secret, navigate]);

  const reminderText = useMemo(() => {
    return `Il tuo codice pubblico: ${publicCode}\nIl tuo segreto: ${secret}\n\nConserva con cura questo promemoria. Il segreto verrà mostrato una sola volta.`;
  }, [publicCode, secret]);

  if (!publicCode || !secret) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopyOk('Segreto copiato negli appunti');
      setTimeout(() => setCopyOk(null), 1500);
    } catch {
      setCopyOk('Copia non riuscita');
      setTimeout(() => setCopyOk(null), 1500);
    }
  };

  const onDownload = () => {
    const blob = new Blob([reminderText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promemoria-${publicCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveLocal = (accept: boolean) => {
    if (!accept) return;
    try {
      const key = `lmw_public_access:${publicCode}`;
      const value = { publicCode, secret, createdAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(value));
      setSaved(true);
    } catch {
      // ignore quota
    }
  };

  return (
    <div className="container-narrow">
      <h3 className="mb-3">Conferma segnalazione</h3>
      <div className="alert alert-warning">
        <div className="fw-semibold">Il segreto verrà mostrato una sola volta.</div>
        Conserva con cura i dati di accesso alla pratica.
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="mb-2"><b>Codice pubblico:</b> <code>{publicCode}</code></div>
          <div className="mb-2"><b>Segreto:</b> <code>{secret}</code></div>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button className="btn btn-outline-dark" onClick={onCopy}>Copia segreto</button>
            <button className="btn btn-outline-secondary" onClick={onDownload}>Scarica promemoria.txt</button>
          </div>
          {copyOk && <div className="text-success small mt-2">{copyOk}</div>}
        </div>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="saveLocal"
            type="checkbox"
            className="form-check-input"
            onChange={(e) => onSaveLocal(e.currentTarget.checked)}
          />
          <label htmlFor="saveLocal" className="form-check-label">
            Salva localmente per follow-up rapido (facoltativo)
          </label>
        </div>
        {saved && <div className="text-success small mt-1">Dati salvati su questo browser.</div>}
      </div>

      <div className="d-flex gap-2">
        <Link to="/case/access" className="btn btn-dark">Accedi alla pratica</Link>
        <Link to="/" className="btn btn-outline-secondary">Torna alla home</Link>
      </div>
    </div>
  );
}


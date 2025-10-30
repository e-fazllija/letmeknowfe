import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPublicReportStatus,
  postPublicReportReply,
  presignPublicReportAttachments,
  ApiError,
  putAbsolute,
  type PublicReport,
} from '../lib/publicCases.service';

const SS_PUB = 'lmw_case_public_code';
const SS_SEC = 'lmw_case_secret';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
]);

export default function CaseAccessPublic() {
  const [publicCode, setPublicCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [reply, setReply] = useState('');
  const [attach, setAttach] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  // ripristina da sessionStorage
  useEffect(() => {
    try {
      const pc = sessionStorage.getItem(SS_PUB) || '';
      const sc = sessionStorage.getItem(SS_SEC) || '';
      if (pc && sc) {
        setPublicCode(pc);
        setSecret(sc);
        // auto-carica stato
        (async () => {
          setError(null);
          setLoadingStatus(true);
          try {
            const data = await getPublicReportStatus(pc, sc);
            setReport(data.report);
          } catch (err: any) {
            const msg = mapError(err);
            setError(msg);
          } finally {
            setLoadingStatus(false);
          }
        })();
      }
    } catch {}
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReport(null);
    const pc = publicCode.trim();
    const sc = secret.trim();
    if (!pc || !sc) return setError('Inserisci codice pratica e codice segreto.');
    setLoadingStatus(true);
    try {
      const data = await getPublicReportStatus(pc, sc);
      setReport(data.report);
      try { sessionStorage.setItem(SS_PUB, pc); sessionStorage.setItem(SS_SEC, sc); } catch {}
    } catch (err: any) {
      const msg = mapError(err);
      setError(msg);
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <div className="container-narrow">
      <h3 className="mb-3">Accedi alla pratica</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit} className="vstack gap-3 mb-3">
        <div>
          <label className="form-label">Codice pratica</label>
          <input
            className="form-control"
            placeholder="Inserisci il codice pratica"
            value={publicCode}
            onChange={(e) => setPublicCode(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">Codice segreto</label>
          <input
            type="password"
            className="form-control"
            placeholder="Inserisci il tuo segreto"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-dark" type="submit" disabled={loadingStatus}>{loadingStatus ? 'Carico…' : 'Accedi'}</button>
          <Link to="/" className="btn btn-outline-secondary">Indietro</Link>
        </div>
      </form>

      {report && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Stato pratica</h5>
            <span className="badge bg-info">{report.status}</span>
          </div>
          <h6 className="mt-3">Messaggi pubblici</h6>
          {report.messages?.length ? (
            <ul className="list-group mb-3">
              {report.messages.map((m, i) => (
                <li className="list-group-item" key={(m as any).id || i}>
                  <div className="small text-muted">{(m as any).createdAt ? new Date((m as any).createdAt as any).toLocaleString() : ''}</div>
                  <div>{m.body}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted mb-3">Nessun messaggio pubblico.</div>
          )}

          <form className="vstack gap-2" onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!report) return;
            const pc = publicCode.trim();
            const sc = secret.trim();
            const body = reply.trim().slice(0, 5000);
            if (!pc || !sc || !body) return;
            setSending(true);
            try {
              // presign + upload (solo mime consentiti)
              let attachmentsOut: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number; proof?: string }[] = [];
              const files = attach ? Array.from(attach) : [];
              const filtered = files.filter(f => ALLOWED_MIME.has(f.type));
              if (filtered.length !== files.length) {
                // scarta silenziosamente quelli non permessi
              }
              if (filtered.length > 0) {
                const presignItems = filtered.map((f) => ({ fileName: f.name, mimeType: f.type || 'application/octet-stream', sizeBytes: f.size }));
                const signed = await presignPublicReportAttachments(presignItems);
                if (signed.length !== filtered.length) throw new Error('Presign incompleto.');
                const jobs = signed.map((item, idx) => (async () => {
                  const file = filtered[idx];
                  await putAbsolute(item.uploadUrl, file, item.headers);
                  return {
                    storageKey: item.storageKey,
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    sizeBytes: file.size,
                    proof: item.proof,
                  };
                })());
                attachmentsOut = await Promise.all(jobs);
              }

              const data = await postPublicReportReply({ publicCode: pc, secret: sc, body, attachments: attachmentsOut, includeThread: true });
              // aggiorna thread se presente
              if ((data as any)?.report) setReport((data as any).report);
              else {
                const refreshed = await getPublicReportStatus(pc, sc);
                setReport(refreshed.report);
              }
              setReply('');
              setAttach(null);
            } catch (err: any) {
              const msg = mapError(err);
              setError(msg);
            } finally {
              setSending(false);
            }
          }}>
            <div>
              <label className="form-label">Invia un messaggio pubblico</label>
              <textarea className="form-control" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} />
            </div>
            <div>
              <label className="form-label">Allegati</label>
              <input
                type="file"
                multiple
                className="form-control"
                accept="image/png,image/jpeg,application/pdf,text/plain"
                onChange={(e) => setAttach(e.currentTarget.files)}
              />
              <div className="form-text">Formati consentiti: PNG, JPEG, PDF, TXT.</div>
            </div>
            <button className="btn btn-dark" type="submit" disabled={!reply.trim() || sending}>{sending ? 'Invio…' : 'Invia'}</button>
          </form>
        </>
      )}
    </div>
  );
}

function mapError(err: any): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'Codice o segreto non validi. Verifica e riprova.';
    if (err.status === 429) return 'Troppe richieste. Attendi qualche minuto e riprova.';
    if (err.status === 400) return 'Dati mancanti o non validi.';
    return err.message || 'Errore imprevisto';
  }
  return err?.message || 'Errore imprevisto';
}

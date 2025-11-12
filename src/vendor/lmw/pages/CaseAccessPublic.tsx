import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPublicReportStatus,
  getPublicReportStatusBySecret,
  postPublicReportReply,
  presignPublicReportAttachments,
  ApiError,
  putAbsolute,
  type PublicReport,
} from '../lib/publicCases.service';

import VoiceSection from '../components/report/VoiceSection';
import { uploadVoiceAttachment } from '../lib/voice.service';
import Toast from 'react-bootstrap/Toast';
import './CaseAccessPublic.css';
const SS_PUB = 'lmw_case_public_code';
const SS_SEC = 'lmw_case_secret';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
]);
// Allow also any audio/* MIME in addition to the explicit list above
const isAllowed = (t: string) => ALLOWED_MIME.has(t) || t.startsWith('audio/');

export default function CaseAccessPublic() {
  const [publicCode, setPublicCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [reply, setReply] = useState('');
  const [attach, setAttach] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | Blob | null>(null);
  const [voiceInclude, setVoiceInclude] = useState<boolean>(false);
  const [showValidationAccess, setShowValidationAccess] = useState(false);
  const [showValidationReply, setShowValidationReply] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // ripristina da sessionStorage
  useEffect(() => {
    try {
      const sc = sessionStorage.getItem(SS_SEC) || '';
      if (sc) {
        setSecret(sc);
        // auto-carica stato via secret-only
        (async () => {
          setError(null);
          setLoadingStatus(true);
          try {
            const data = await getPublicReportStatusBySecret(sc);
            setReport(data.report);
            try { if (data.report?.publicCode) setPublicCode(data.report.publicCode); sessionStorage.setItem(SS_PUB, data.report?.publicCode || ''); } catch {}
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
    const sc = secret.trim();
    if (!sc) {
      setShowValidationAccess(true);
      setToastMsg('Compila i campi obbligatori evidenziati');
      try {
        document.getElementById('secret')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (document.getElementById('secret') as HTMLInputElement | null)?.focus?.();
      } catch {}
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    setLoadingStatus(true);
    try {
      const data = await getPublicReportStatusBySecret(sc);
      setReport(data.report);
      try { if (data.report?.publicCode) setPublicCode(data.report.publicCode); sessionStorage.setItem(SS_PUB, data.report?.publicCode || ''); sessionStorage.setItem(SS_SEC, sc); } catch {}
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
          <label className="form-label" htmlFor="secret">Codice segreto</label>
          <input
            id="secret"
            type="password"
            className={"form-control" + (showValidationAccess && !secret.trim() ? " is-invalid" : "")}
            placeholder="Inserisci il tuo segreto"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          {showValidationAccess && !secret.trim() && (
            <div className="invalid-feedback d-block">Inserisci il codice segreto</div>
          )}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-dark" type="submit" disabled={loadingStatus}>{loadingStatus ? 'Carico…' : 'Accedi'}</button>
          <Link to="/" className="btn btn-outline-secondary">Indietro</Link>
        </div>
      </form>

      {report && (
        <>
          <div className="d-flex align-items-center gap-2 mb-2">
            <h5 className="mb-0">Stato pratica</h5>
            <span className="badge bg-info">{report.status}</span>
          </div>
          <h6 className="mt-3">Messaggi pubblici</h6>
          {report.messages?.length ? (
            <ul className="list-unstyled chat-thread mb-3">
              {(report.messages || [])
                .slice()
                .sort((a: any, b: any) => {
                  const toTime = (x: any) => {
                    const raw = x?.createdAt ?? x?.ts ?? 0;
                    if (typeof raw === 'number') return raw;
                    const s = String(raw || '').trim();
                    if (!s) return 0;
                    const asNum = Number(s);
                    if (!Number.isNaN(asNum)) return asNum;
                    const parsed = Date.parse(s);
                    return Number.isNaN(parsed) ? 0 : parsed;
                  };
                  return toTime(a) - toTime(b);
                })
                .map((m, i) => {
                  const who = String(((m as any).author || '')).toUpperCase();
                  const PUBLIC_ALIASES = new Set(['PUBLIC', 'SEGNALANTE', 'CITIZEN', 'UTENTE', 'USER']);
                  const isMe = PUBLIC_ALIASES.has(who);
                  const ts = (m as any).createdAt ? new Date((m as any).createdAt as any).toLocaleString() : '';
                  return (
                    <li className="chat-row" key={(m as any).id || i}>
                      <div className={'d-flex ' + (isMe ? 'justify-content-end' : 'justify-content-start')}>
                      <div className={'chat-bubble rounded-3 shadow-sm p-2 ' + (isMe ? 'bg-primary text-white' : 'bg-light')}>
                        <div className="chat-body">{m.body}</div>
                        {ts && (
                          <div className={'chat-ts small mt-1 ' + (isMe ? 'text-white-50' : 'text-muted')}>{ts}</div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-muted mb-3">Nessun messaggio pubblico.</div>
          )}

          <form className="vstack gap-2" onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!report) return;
            const sc = secret.trim();
            const pc = (report?.publicCode || publicCode).trim();
            const body = reply.trim().slice(0, 5000);
            if (!pc || !sc || !body) {
              if (!body) {
                setShowValidationReply(true);
                setToastMsg('Compila i campi obbligatori evidenziati');
                try {
                  document.getElementById('replyMsg')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  (document.getElementById('replyMsg') as HTMLTextAreaElement | null)?.focus?.();
                } catch {}
                setTimeout(() => setToastMsg(null), 3000);
              }
              return;
            }
            setSending(true);
            try {
              // presign + upload (solo mime consentiti)
              let attachmentsOut: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number; proof?: string }[] = [];
              const files = attach ? Array.from(attach) : [];
              const audioFiles = files.filter(f => (f.type || '').startsWith('audio/'));
              const nonAudioFiltered = files.filter(f => !(f.type || '').startsWith('audio/') && isAllowed(f.type));
              if ((nonAudioFiltered.length + audioFiles.length) !== files.length) {
                // scarta silenziosamente quelli non permessi
              }
              if (nonAudioFiltered.length > 0) {
                const presignItems = nonAudioFiltered.map((f) => ({ fileName: f.name, mimeType: f.type || 'application/octet-stream', sizeBytes: f.size }));
                const signed = await presignPublicReportAttachments(presignItems);
                if (signed.length !== nonAudioFiltered.length) throw new Error('Presign incompleto.');
                const jobs = signed.map((item, idx) => (async () => {
                  const file = nonAudioFiltered[idx];
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
              // Carica eventuali audio come allegati voce (non blocca la UI)
              const audioUploads: Promise<any>[] = [];
              if (voiceFile && voiceInclude) {
                audioUploads.push(uploadVoiceAttachment(voiceFile as Blob, report.id, sc).catch(err => { try { console.warn('[voice] upload audio (voiceFile) failed', err); } catch {} }));
              }
              for (const af of audioFiles) {
                audioUploads.push(uploadVoiceAttachment(af as Blob, report.id, sc).catch(err => { try { console.warn('[voice] upload audio (attachments) failed', err); } catch {} }));
              }
              if (audioUploads.length) {
                Promise.allSettled(audioUploads).then(() => { /* noop */ });
              }
            } catch (err: any) {
              const msg = mapError(err);
              setError(msg);
            } finally {
              setSending(false);
            }
          }}>
            <div>
              <label className="form-label" htmlFor="replyMsg">Invia un messaggio pubblico</label>
              <textarea
                id="replyMsg"
                className={"form-control" + (showValidationReply && !reply.trim() ? " is-invalid" : "")}
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={5000}
              />
              {showValidationReply && !reply.trim() && (
                <div className="invalid-feedback d-block">Scrivi il messaggio</div>
              )}
            </div>
            <div>
              <label className="form-label">Allegati</label>
              <input
                type="file"
                multiple
                className="form-control"
                accept="image/png,image/jpeg,application/pdf,text/plain,audio/*"
                onChange={(e) => setAttach(e.currentTarget.files)}
              />
              <div className="form-text">Formati consentiti: PNG, JPEG, PDF, TXT. Per gli audio puoi registrare/caricare sotto e trascrivere il testo automaticamente; gli audio verranno allegati alla pratica.</div>
            </div>
            <div>
              <VoiceSection
                title="Allegato vocale"
                onChange={setVoiceFile}
                onText={(txt) => setReply((prev) => (prev ? `${prev}\n\n${txt}` : txt))}
                onIncludeAttachmentChange={setVoiceInclude}
                disabled={sending}
              />
            </div>
            <button className="btn btn-dark" type="submit" disabled={sending}>{sending ? 'Invio…' : 'Invia'}</button>
          </form>
        </>
      )}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <Toast bg="danger" onClose={() => setToastMsg(null)} show={!!toastMsg} delay={3000} autohide>
          <Toast.Body className="text-white">{toastMsg}</Toast.Body>
        </Toast>
      </div>
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



import { useCallback, useEffect, useState } from "react";
import {
  HashRouter, Routes, Route, Navigate, Outlet, useNavigate,
  useLocation, useParams, Link
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { publicReports, ApiError } from "./lib/publicReports.service";
import type { Department, Category } from "./lib/publicReports.service";
import Confirm from "./pages/PublicConfirm";
import CaseAccessPublic from "./pages/CaseAccessPublic";
import {
  createTextReport,
  createVoiceReport,
  getReport,
  addClarification,
  type Report,
  getReportBySecret,   // ⬅️ usa lo store centralizzato
} from "./lib/store";
import { detectPII } from "./utils/pii";
import VoiceSection from "./components/report/VoiceSection";
import { presignVoiceAttachment, createVoiceReport as createVoiceReportVoice } from "./lib/voice.service";
import "./index.css";


/* ---------- Layout con sidebar fissa ---------- */
function Shell() {
  return (
    <div className="container-fluid">
      <div className="row">
        {/* ⬇️ aggiungo la classe sidebar-col per colorare tutta la colonna */}
        <div className="col-12 col-md-3 col-lg-2 p-0 sidebar-col">
          <Sidebar />
        </div>
        <main className="col-12 col-md-9 col-lg-10 p-4 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


/* ---------- Pagina: Nuova segnalazione (verticale) ---------- */
function NewTextReport() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { openVoice?: boolean } };

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [privacy, setPrivacy] = useState<"Anonimo" | "Confidenziale">("Anonimo");
  const [subject, setSubject] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [revealSecret, setRevealSecret] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [voiceFile, setVoiceFile] = useState<File | Blob | null>(null);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (location?.state?.openVoice) {
      setVoiceEnabled(true);
      // facoltativo: scroll alla card
      try { document.getElementById("voice-section")?.scrollIntoView({ behavior: "instant" as any }); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setWarnings(detectPII([subject, description]));
  }, [subject, description]);

  // Lookups iniziali: reparti
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const deps = await publicReports.listPublicDepartments();
        if (!alive) return;
        setDepartments(deps);
      } catch (e: any) {
        setLookupMsg(e?.message || 'Impossibile caricare i reparti');
      }
    })();
    return () => { alive = false; };
  }, []);

  // Al cambio reparto: carica categorie
  useEffect(() => {
    if (!department) { setCategories([]); return; }
    let alive = true;
    setLookupMsg(null);
    (async () => {
      try {
        const cats = await publicReports.listPublicCategories(department);
        if (!alive) return;
        setCategories(cats);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 404) {
          setCategories([]);
          setLookupMsg('Nessuna categoria trovata per il reparto selezionato.');
        } else {
          setLookupMsg(e?.message || 'Errore nel caricamento categorie');
        }
      }
    })();
    return () => { alive = false; };
  }, [department]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments(e.currentTarget.files);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) return setError("Compila il campo Oggetto.");
    if (!description.trim()) return setError("Compila il campo Descrizione.");

    setSubmitting(true);
    try {
      // Limiti allegati da env
      const maxFiles = parseInt((import.meta as any).env?.VITE_ATTACH_MAX_FILES || '0', 10) || 0;
      const maxMb = parseInt((import.meta as any).env?.VITE_ATTACH_MAX_FILE_MB || '0', 10) || 0;

      const selected: File[] = [];
      if (attachments?.length) {
        for (let i = 0; i < attachments.length; i++) selected.push(attachments.item(i)!);
      }
      if (maxFiles > 0 && selected.length > maxFiles) {
        return setError(`Puoi allegare al massimo ${maxFiles} file.`);
      }
      if (maxMb > 0) {
        const maxBytes = maxMb * 1024 * 1024;
        const tooBig = selected.find(f => f.size > maxBytes);
        if (tooBig) return setError(`Il file "${tooBig.name}" supera il limite di ${maxMb} MB.`);
      }

      // Presign e upload (facoltativo)
      const presignEnabled = String((import.meta as any).env?.VITE_PRESIGN_ENABLED || '').toLowerCase() === 'true';
      let attachmentsForCreate: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string; proof: string }[] = [];

      if (presignEnabled && selected.length > 0) {
        try {
          const presigned = await publicReports.presignPublicAttachment(selected);
          if (presigned.length !== selected.length) throw new Error('Presign: risposta incompleta.');

          // Upload PUT su ciascun presigned
          const putJobs = presigned.map((item, idx) => (async () => {
            const file = selected[idx];
            const { putAbsolute } = (await import('./lib/api'));
            const result = await putAbsolute<{ etag?: string }>(item.uploadUrl, file, item.headers);
            return { etag: result.etag || '', item, file };
          })());
          const results = await Promise.all(putJobs);

          // Finalize (se necessario/abilitato dal BE). Se fallisce, non blocca la creazione.
          try {
            const finalizeItems = results.map(({ etag, item, file }) => ({
              storageKey: item.storageKey,
              etag,
              sizeBytes: file.size,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
            }));
            await publicReports.finalizePublicAttachment(finalizeItems);
          } catch {
            // opzionale: log silente o messaggio non bloccante
          }

          // Prepara attachments per create
          attachmentsForCreate = results.map(({ item, file }) => ({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            storageKey: item.storageKey,
            proof: item.proof,
          }));
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 501) {
            // presign disabilitato lato BE → procedi senza allegati
            attachmentsForCreate = [];
          } else if (e instanceof ApiError && e.status === 400) {
            return setError(e.message || 'Allegato non valido (400).');
          } else {
            // altri errori upload/presign
            return setError(e?.message || 'Errore caricamento allegati.');
          }
        }
      }

      // Sezione vocale opzionale: presign/upload e invio tramite /public/voice/reports
      // Fallback: se fallisce, proseguiamo con la creazione testuale normale.
      let voiceAttachment: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string; proof: string } | null = null;
      if (voiceEnabled && voiceFile) {
        try {
          const vfName = (voiceFile as File).name || "voice_message.webm";
          const vfType = (voiceFile as any).type || "audio/webm";
          const vfSize = (voiceFile as any).size || 0;
          const presigned = await presignVoiceAttachment([
            { fileName: vfName, mimeType: vfType, sizeBytes: vfSize },
          ]);
          if (presigned && presigned.length > 0) {
            const { uploadUrl, headers, storageKey, proof } = presigned[0];
            await fetch(uploadUrl, { method: 'PUT', body: voiceFile as Blob, headers });
            voiceAttachment = {
              storageKey,
              proof,
              sizeBytes: vfSize,
              fileName: vfName,
              mimeType: vfType,
            };
          }
        } catch (err) {
          try { console.warn('[voice] upload fallito, procedo senza audio', err); } catch {}
          voiceAttachment = null;
        }
      }

      const basePayload = {
        date: new Date(date).toISOString(),
        source: 'WEB' as const,
        privacy: privacy === 'Anonimo' ? 'ANONIMO' : 'CONFIDENZIALE',
        subject,
        description,
        departmentId: department || undefined,
        categoryId: category || undefined,
      } as any;

      let res: { publicCode: string; secret: string };
      if (voiceAttachment) {
        const voicePayload = {
          ...basePayload,
          attachments: [
            ...attachmentsForCreate,
            voiceAttachment,
          ],
        };
        res = await createVoiceReportVoice(voicePayload) as any;
      } else {
        const payload = {
          ...basePayload,
          attachments: attachmentsForCreate.length ? attachmentsForCreate : undefined,
        };
        res = await publicReports.createPublicReport(payload) as any;
      }
      navigate(`/confirm`, { state: { publicCode: res.publicCode, secret: res.secret } });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || "Errore imprevisto");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-narrow">
      <h3 className="mb-3">Nuova segnalazione</h3>

      {warnings.length > 0 && (
        <div className="alert alert-warning">
          <div className="fw-semibold mb-1">Possibile presenza di dati identificativi.</div>
          <ul className="mb-0 small">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          <div className="small mt-1">Il controllo è informativo.</div>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onSubmit} className="vstack gap-3">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Data</label>
            <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="form-label">Privacy del segnalante</label>
          <select
            className="form-select"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as "Anonimo" | "Confidenziale")}
          >
            <option value="Anonimo">Anonimo</option>
            <option value="Confidenziale">Confidenziale</option>
          </select>
        </div>

        <div>
          <label className="form-label">Oggetto</label>
          <input className="form-control" placeholder="Oggetto della segnalazione" value={subject}
            onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Reparti</label>
            <select className="form-select" value={department} onChange={(e) => { setDepartment(e.target.value); setCategory(''); }}>
              <option value="">{lookupMsg ? 'Errore caricamento' : ((departments || []).length ? 'Seleziona…' : 'Caricamento...')}</option>
              {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!department || (categories || []).length === 0}>
              <option value="">{!department ? 'Seleziona reparto' : (lookupMsg ? 'Errore caricamento' : ((categories || []).length ? 'Seleziona…' : 'Caricamento...'))}</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {lookupMsg && <div className="small text-muted mt-1">{lookupMsg}</div>}
          </div>
        </div>

        {/* Sezione opzionale: Segnalazione vocale */}
        <div className="mt-2">
          <div className="form-check form-switch mt-1 mb-2 fw-semibold">
            <input
              className="form-check-input"
              type="checkbox"
              id="voice-switch"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.currentTarget.checked)}
            />
            <label className="form-check-label" htmlFor="voice-switch">
              Aggiungi segnalazione vocale
            </label>
          </div>
          {voiceEnabled && (
            <VoiceSection
              onChange={setVoiceFile}
              onText={(txt) => setDescription((prev) => prev || txt)}
              disabled={submitting}
            />
          )}
        </div>

        <div>
          <label className="form-label">Descrizione</label>
          <textarea className="form-control" rows={8} value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="form-label">Allegati</label>
          <div className="dropzone">
            <input type="file" multiple onChange={handleFiles} />
            <div className="text-muted small mt-2">File fino a ~100MB (demo: solo elenco)</div>
            {attachments?.length ? (
              <ul className="small mt-2 mb-0">
                {Array.from(attachments).map((f, i) => <li key={i}>{f.name}</li>)}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="p-3 bg-light border rounded">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="reveal" checked={revealSecret}
              onChange={(e) => setRevealSecret(e.currentTarget.checked)} />
            <label className="form-check-label" htmlFor="reveal">
              Rivela la passphrase univoca al termine della creazione
            </label>
          </div>
          <div className="small text-muted mt-1">
            La passphrase serve per accedere successivamente alla pratica.
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <Link to="/" className="btn btn-outline-secondary">Annulla</Link>
          <button type="submit" className="btn btn-dark" disabled={submitting}>
            {submitting ? "Invio…" : "Invia"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Pagina: Segnalazione vocale ---------- */
function VoiceReport() {
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRec = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      setChunks([]);
      mr.ondataavailable = (e) => setChunks((c) => c.concat(e.data));
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `registrazione-${Date.now()}.webm`, { type: "audio/webm" });
        setAudioFile(file);
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || "Impossibile accedere al microfono");
    }
  };
  const stopRec = () => { mediaRecorder?.stop(); setRecording(false); };
  const fileChange = (e: React.ChangeEvent<HTMLInputElement>) => setAudioFile(e.currentTarget.files?.[0] || null);

  const simulateTranscription = async () => {
    if (!audioFile) return setError("Seleziona o registra un file audio.");
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 800));
    setTranscript(`Trascrizione generata (demo) per: ${audioFile.name}`);
    setProcessing(false);
  };

  const onSubmit = async () => {
    if (!audioFile) return setError("Seleziona un file audio.");
    try {
      const payload = {
        audio: { name: audioFile.name, size: audioFile.size, type: audioFile.type },
        transcript: transcript.trim(),
        source: "Widget Voice",
        createdAt: new Date().toISOString(),
      } as any;
      const res = await publicApi.createReportVoice(payload);
      navigate(`/confirm`, { state: { publicCode: res.publicCode, secret: res.secret } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore invio voce');
    }
  };

  return (
    <div className="container-narrow">
      <h3 className="mb-3">Segnalazione vocale</h3>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {!recording
          ? <button className="btn btn-dark" onClick={startRec}>Inizia registrazione</button>
          : <button className="btn btn-danger" onClick={stopRec}>Termina registrazione</button>}
        <input type="file" accept="audio/*" onChange={fileChange} />
      </div>

      {audioFile && (
        <div className="alert alert-info py-2">
          File: <strong>{audioFile.name}</strong> ({Math.round(audioFile.size / 1024)} KB)
        </div>
      )}

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-outline-dark" onClick={simulateTranscription} disabled={!audioFile || processing}>
          {processing ? "Trascrizione in corso…" : "Simula trascrizione"}
        </button>
      </div>

      <div className="mb-3">
        <label className="form-label">Testo trascritto</label>
        <textarea className="form-control" rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-dark" onClick={onSubmit} disabled={!audioFile}>Invia</button>
        <Link to="/" className="btn btn-outline-secondary">Annulla</Link>
      </div>
    </div>
  );
}

/* ---------- Pagina: Accesso pratica (SOLO segreto) ---------- */
function CaseAccess() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [attach, setAttach] = useState<FileList | null>(null);
  const [attachmentsEnabled, setAttachmentsEnabled] = useState<boolean>(true);
  const [info, setInfo] = useState<string | null>(null);

  const probeAttachments = async (files: FileList | null) => {
    if (!files?.length) return;
    const meta = Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type }));
    const res = await publicApi.tryPresign(meta);
    if (res === 'unavailable') {
      setAttachmentsEnabled(false);
      setInfo('Allegati non disponibili su questo canale (501 presign).');
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const s = secret.trim();
    if (!s) return setError("Inserisci il codice segreto.");
    const report = getReportBySecret(s);           // ⬅️ usa lo store centralizzato
    if (!report) return setError("Segreto non valido o pratica non trovata.");
    navigate(`/case/${report.code}`, { state: { secret: s } });
  };

  return (
    <div className="container-narrow">
      <h3 className="mb-3">Accedi alla pratica</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit} className="vstack gap-3">
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
          <button className="btn btn-dark" type="submit">Accedi</button>
          <Link to="/" className="btn btn-outline-secondary">Indietro</Link>
        </div>
      </form>
    </div>
  );
}

/* ---------- Pagina: Dettaglio pratica + chiarimenti ---------- */
function CaseView() {
  const { code } = useParams();
  const location = useLocation() as { state?: { secret?: string; justCreated?: boolean; revealSecret?: boolean } };
  const [secret, setSecret] = useState(location.state?.secret || "");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<string | null>(location.state?.justCreated ? "Pratica creata" : null);

  const load = useCallback(() => {
    setError(null);
    if (!code || !secret) return;
    const r = getReport(code, secret);
    if (!r) setError("Codice o segreto non validi.");
    setReport(r ?? null);
  }, [code, secret]);

  useEffect(() => { load(); }, [load]);

  const sendClar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !msg.trim()) return;
    addClarification(report.code, secret, msg.trim());
    setMsg("");
    setOk("Messaggio inviato");
    load();
  };

  if (!code) return <Navigate to="/case/access" replace />;

  return (
    <div className="container-narrow">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h3 className="mb-0">Pratica {code}</h3>
        <span className="badge bg-info">{report?.status ?? "—"}</span>
      </div>

      {!location.state?.secret && (
        <div className="alert alert-secondary">
          Inserisci il segreto per accedere ai dettagli:
          <input type="password" className="form-control mt-2" value={secret} onChange={(e) => setSecret(e.target.value)} />
          <button className="btn btn-dark mt-2" onClick={load}>Conferma</button>
        </div>
      )}

      {ok && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {ok}
          {location.state?.revealSecret && secret ? (
            <div className="mt-1"><strong>Segreto:</strong> <code>{secret}</code></div>
          ) : null}
          <button type="button" className="btn-close" onClick={() => setOk(null)} />
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {report && (
        <>
          <ul className="list-group mb-3">
            <li className="list-group-item"><b>Tipo:</b> {report.kind === "text" ? "Testo" : "Vocale"}</li>

            {report.kind === "text" && report.data.subject ? (
              <>
                <li className="list-group-item"><b>Anonima:</b> {report.data.privacy === "Anonimo" ? "Sì" : "No"}</li>
                <li className="list-group-item"><b>Oggetto:</b> {report.data.subject}</li>
                <li className="list-group-item"><b>Reparto:</b> {report.data.department || "—"}</li>
                <li className="list-group-item"><b>Categoria:</b> {report.data.category || "—"}</li>
                <li className="list-group-item"><b>Data:</b> {report.data.date || "—"}</li>
                <li className="list-group-item"><b>Descrizione:</b> <div className="mt-1">{report.data.description}</div></li>
                <li className="list-group-item">
                  <b>Allegati:</b>{" "}
                  {report.data.attachments?.length
                    ? report.data.attachments.map((a: { name: string }) => a.name).join(", ")
                    : "—"}
                </li>
              </>
            ) : report.kind === "text" ? (
              <>
                <li className="list-group-item"><b>Anonima:</b> {report.data.anonymous ? "Sì" : "No"}</li>
                <li className="list-group-item"><b>Chi:</b> {report.data.who || "—"}</li>
                <li className="list-group-item"><b>Cosa:</b> {report.data.what}</li>
                <li className="list-group-item"><b>Dove:</b> {report.data.where}</li>
                <li className="list-group-item"><b>Quando:</b> {report.data.when}</li>
                <li className="list-group-item"><b>Prove/Dettagli:</b> {report.data.evidence || "—"}</li>
                <li className="list-group-item">
                  <b>Allegati:</b>{" "}
                  {report.data.attachments?.length
                    ? report.data.attachments.map((a: { name: string }) => a.name).join(", ")
                    : "—"}
                </li>
              </>
            ) : (
              <>
                <li className="list-group-item"><b>Audio:</b> {report.data.audio?.name} ({Math.round((report.data.audio?.size || 0)/1024)} KB)</li>
                <li className="list-group-item"><b>Trascrizione:</b><div className="mt-1">{report.data.transcript || <span className="text-muted">Non disponibile</span>}</div></li>
              </>
            )}

            <li className="list-group-item"><b>Creato il:</b> {new Date(report.createdAt).toLocaleString()}</li>
            <li className="list-group-item"><b>Stato:</b> {report.status}</li>
          </ul>

          <h5 className="mb-2">Chiarimenti</h5>
          {report.messages.length === 0 && <p className="text-muted">Nessun messaggio.</p>}
          <ul className="list-group mb-3">
            {report.messages.map((m: { ts: number; text: string }, i: number) => (
              <li className="list-group-item" key={i}>
                <div className="small text-muted">{new Date(m.ts).toLocaleString()}</div>
                <div>{m.text}</div>
              </li>
            ))}
          </ul>

          <form onSubmit={sendClar} className="vstack gap-2">
            <div>
              <label className="form-label">Invia un chiarimento</label>
              <textarea className="form-control" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
            </div>
            <button className="btn btn-dark" type="submit" disabled={!msg.trim()}>Invia</button>
          </form>

          <div className="text-center mt-3">
            <Link to="/" className="btn btn-outline-secondary">Torna alla home</Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Pagina: Info ANAC ---------- */
function AnacInfo() {
  const ANAC_LINK = "https://www.anticorruzione.it/";
  return (
    <div className="container-narrow">
      <h3 className="mb-3">Canale esterno ANAC</h3>
      <ol>
        <li>Usare il canale ANAC quando i canali interni non sono appropriati.</li>
        <li>Preparare la documentazione utile.</li>
        <li>Accedere al portale ANAC con il link seguente.</li>
      </ol>
      <div className="alert alert-secondary">
        <a href={ANAC_LINK} target="_blank" rel="noreferrer">Apri il sito ANAC</a>
      </div>
    </div>
  );
}

/* ---------- Router ---------- */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Navigate to="/new/text" replace />} />
          <Route path="/new/text" element={<NewTextReport />} />
          {/* Retro-compatibilità: vecchia route voce → redirect a nuova con voice aperta */}
          <Route path="/new/voice" element={<Navigate to="/new/text" state={{ openVoice: true }} replace />} />
          <Route path="/voice" element={<Navigate to="/new/text" state={{ openVoice: true }} replace />} />
          <Route path="/case/access" element={<CaseAccessPublic />} />
          <Route path="/case/:code" element={<CaseView />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/anac" element={<AnacInfo />} />
          <Route path="*" element={<Navigate to="/new/text" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

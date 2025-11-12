// src/components/ReportForm.tsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { publicReports, ApiError } from "../lib/publicReports.service";
import type { Department, Category } from "../lib/publicReports.service";
import { detectPII } from "../utils/pii";
import VoiceSection from "./report/VoiceSection";
import { uploadVoiceAttachment } from "../lib/voice.service";
import Toast from "react-bootstrap/Toast";
import { getAdminImportUrl, type AdminImportPayload } from "../lib/adminHandoff";

export default function ReportForm() {
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
  const [acceptNorm, setAcceptNorm] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [voiceFile, setVoiceFile] = useState<File | Blob | null>(null);
  const [voiceInclude, setVoiceInclude] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (location?.state?.openVoice) {
      setVoiceEnabled(true);
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

    const missingSubject = subject.trim() === "";
    const missingDepartment = !department;
    const hasCategories = !!department && (categories || []).length > 0;
    const missingCategory = hasCategories ? !category : false;
    const missingDescription = description.trim() === "";
    const missingConsent = !acceptNorm;

    if (missingSubject || missingDepartment || missingCategory || missingDescription || missingConsent) {
      setShowValidation(true);
      setToastMsg("Compila i campi obbligatori evidenziati");
      try {
        const firstId = missingSubject
          ? "subject"
          : missingDepartment
          ? "department"
          : missingCategory
          ? "category"
          : missingDescription
          ? "description"
          : "accept-norm";
        document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById(firstId) as HTMLElement | null)?.focus?.();
      } catch {}
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

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
        setSubmitting(false);
        return setError(`Puoi allegare al massimo ${maxFiles} file.`);
      }
      if (maxMb > 0) {
        const maxBytes = maxMb * 1024 * 1024;
        const tooBig = selected.find(f => f.size > maxBytes);
        if (tooBig) { setSubmitting(false); return setError(`Il file "${tooBig.name}" supera il limite di ${maxMb} MB.`); }
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
            const { putAbsolute } = (await import('../lib/api'));
            const result = await putAbsolute<{ etag?: string }>(item.uploadUrl, file, item.headers);
            return { etag: result.etag || '', item, file };
          })());
          const results = await Promise.all(putJobs);

          // Prepara attachments per create
          attachmentsForCreate = results.map(({ item, file }) => ({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            storageKey: item.storageKey,
            proof: item.proof,
          }));

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
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 501) {
            // presign disabilitato lato BE —' procedi senza allegati
            attachmentsForCreate = [];
          } else if (e instanceof ApiError && e.status === 400) {
            setSubmitting(false);
            return setError(e.message || 'Allegato non valido (400).');
          } else {
            // altri errori upload/presign
            setSubmitting(false);
            return setError(e?.message || 'Errore caricamento allegati.');
          }
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
        ...(privacy === 'Confidenziale' ? {
          reporterName: `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim(),
        } : {}),
      } as any;

      const payload = {
        ...basePayload,
        attachments: attachmentsForCreate.length ? attachmentsForCreate : undefined,
      };
      const res = await publicReports.createPublicReport(payload) as any as { reportId: string; publicCode: string; secret: string };

      // Dev: costruisci e logga l'URL di import per l'admin; rendilo disponibile in sessionStorage
      try {
        const adminPayload: AdminImportPayload = {
          reporterType: privacy,
          source: 'Widget Web',
          department: department || undefined,
          category: category || undefined,
          description: description || '(senza descrizione)',
          title: subject || undefined,
          createdAt: new Date().toISOString(),
        };
        const adminUrl = getAdminImportUrl(adminPayload);
        try { (window as any).LMW_ADMIN_IMPORT_URL = adminUrl; } catch {}
        try { sessionStorage.setItem('lmw_admin_import_url', adminUrl); } catch {}
        try { if ((import.meta as any).env?.DEV) console.log('[LMW] Admin import URL:', adminUrl); } catch {}
      } catch {}

      // Se richiesto, carica il messaggio vocale come allegato sul report appena creato (non blocca in caso di errore)
      if (voiceEnabled && voiceInclude && voiceFile) {
        try {
          await uploadVoiceAttachment(voiceFile as Blob, (res as any).reportId, (res as any).secret);
        } catch (err) {
          try { console.warn('[voice] upload DB fallito', err); } catch {}
        }
      }

      navigate(`/confirm`, { state: { publicCode: (res as any).publicCode, secret: (res as any).secret } });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || "Errore imprevisto");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
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
          <div className="col-12">
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

        {privacy === 'Confidenziale' && (
          <div className="alert alert-secondary">
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Nome</label>
                <input
                  className="form-control"
                  placeholder="Nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Cognome</label>
                <input
                  className="form-control"
                  placeholder="Cognome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="form-text mt-1">Richiesto per le segnalazioni confidenziali.</div>
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="subject">Oggetto</label>
          <input
            id="subject"
            className={"form-control" + (showValidation && !subject.trim() ? " is-invalid" : "")}
            placeholder="Oggetto della segnalazione"
            value={subject}
            onChange={(e) => setSubject(e.target.value)} />
          {showValidation && !subject.trim() && (
            <div className="invalid-feedback d-block">Compila il campo Oggetto</div>
          )}
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="department">Reparto</label>
            <select id="department" className={"form-select" + (showValidation && !department ? " is-invalid" : "")} value={department} onChange={(e) => { setDepartment(e.target.value); setCategory(''); }}>
              <option value="">{lookupMsg ? 'Errore caricamento' : ((departments || []).length ? 'Seleziona…' : 'Caricamento...')}</option>
              {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {showValidation && !department && (
              <div className="invalid-feedback d-block">Compila il campo Reparto</div>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="category">Categoria</label>
            <select id="category" className={"form-select" + (showValidation && (!!department && (categories || []).length > 0 && !category) ? " is-invalid" : "")} value={category} onChange={(e) => setCategory(e.target.value)} disabled={!department || (categories || []).length === 0}>
              <option value="">{!department ? 'Seleziona reparto' : (lookupMsg ? 'Errore caricamento' : ((categories || []).length ? 'Seleziona…' : 'Caricamento...'))}</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {lookupMsg && <div className="small text-muted mt-1">{lookupMsg}</div>}
            {showValidation && (!!department && (categories || []).length > 0 && !category) && (
              <div className="invalid-feedback d-block">Seleziona una categoria</div>
            )}
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
              onText={(txt) => setDescription((prev) => (prev ? `${prev}\n\n${txt}` : txt))}
              onIncludeAttachmentChange={setVoiceInclude}
              disabled={submitting}
            />
          )}
        </div>

        <div>
          <label className="form-label" htmlFor="description">Descrizione</label>
          <textarea
            id="description"
            className={"form-control" + (showValidation && !description.trim() ? " is-invalid" : "")}
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)} />
          {showValidation && !description.trim() && (
            <div className="invalid-feedback d-block">Compila la descrizione</div>
          )}
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

        {/* Accettazione normativa obbligatoria */}
        <div className="p-3 bg-light border rounded">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="accept-norm"
              checked={acceptNorm}
              onChange={(e) => setAcceptNorm(e.currentTarget.checked)}
            />
            <label className="form-check-label" htmlFor="accept-norm">
              Dichiaro di aver letto e compreso la normativa
            </label>
            {showValidation && !acceptNorm && (
              <div className="text-danger small mt-1">Devi accettare la normativa</div>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <Link to="/" className="btn btn-outline-secondary">Annulla</Link>
          <button type="submit" className="btn btn-dark" disabled={submitting}>
            {submitting ? "Invio…" : "Invia"}
          </button>
        </div>
      </form>

      {/* Toast error top-right (fixed to viewport) */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <Toast bg="danger" onClose={() => setToastMsg(null)} show={!!toastMsg} delay={3000} autohide>
          <Toast.Body className="text-white">{toastMsg}</Toast.Body>
        </Toast>
      </div>
    </div>
  );
}

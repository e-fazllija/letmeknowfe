import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, Col, Form, ListGroup, Row, Spinner, Toast, ToastContainer } from "react-bootstrap";
import { useAuth, isAuditor } from "@/context/AuthContext";
import {
  getReportById,
  getMessages,
  postMessage,
  patchStatus,
  assignMe,
  assign,
  unassign,
  takeReport,
  fetchAgentUsersCached,
  type AttachmentItem,
  type ReportStatus,
  type Message,
} from "@/lib/reports.v2.service";
import { STATUS_LABELS, statusToLabel } from "@/lib/status.labels";
import {
  listReportAttachments,
  downloadAttachment as dlAttachment,
  previewAttachment,
  presign as presignBatch,
  finalize as finalizeBatch,
  attachToReport,
} from "@/lib/reportAttachments.service";
import { uploadPresigned } from "@/lib/attachments.service";
import { getMyNote, putMyNote, deleteMyNote } from "@/lib/reportPersonalNotes.service";
import { useDebounced } from "@/hooks/useDebounced";
import AttachmentPreviewModal from "@/components/common/AttachmentPreviewModal";
import { fetchDepartments as fetchDeptApi } from "@/lib/departments.api";
import { fetchCategories as fetchCatsApi } from "@/lib/categories.api";
import { useUserResolver } from "@/lib/useUserResolver";

const StatusSchema = z.object({ status: z.enum(["OPEN","IN_PROGRESS","SUSPENDED","NEED_INFO","CLOSED"]) });
type StatusForm = z.infer<typeof StatusSchema>;
const MessageSchema = z.object({ body: z.string().min(1).max(5000), visibility: z.enum(["PUBLIC","INTERNAL"]).optional() });
type MessageForm = z.infer<typeof MessageSchema>;

function renderPlainWithBreaks(s?: string | null) {
  if (!s) return <span className="text-muted">-</span>;
  const safe = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return <span dangerouslySetInnerHTML={{ __html: safe.replace(/\n/g, "<br/>") }} />;
}

function safeTitle(r?: any) {
  const t = r?.title?.trim?.();
  const s = r?.summary?.trim?.();
  return t || s || "-";
}

export default function ReportDetailV2() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const auditor = isAuditor(user);
  const isAdmin = (user?.role === "admin" || user?.role === "superhost");
  const meId = user?.id ? String(user.id) : undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "primary" | "success" | "danger" }>({ show: false, message: "", variant: "primary" });
  const [assignBusy, setAssignBusy] = useState(false);
  const [loadingTake, setLoadingTake] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | undefined>(undefined);
  const [previewMime, setPreviewMime] = useState<string | undefined>(undefined);

  const [deptList, setDeptList] = useState<Array<{ id: string; name: string }>>([]);
  const [catList, setCatList] = useState<Array<{ id: string; name: string }>>([]);
  const deptNameMap = useMemo(() => new Map(deptList.map(d => [String(d.id), String(d.name)])), [deptList]);
  const catNameMap = useMemo(() => new Map(catList.map(c => [String(c.id), String(c.name)])), [catList]);

  const [users, setUsers] = useState<Array<{ id: string; email?: string; name?: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string>("");

  const assigneeId: string | undefined = useMemo(() => String((report as any)?.internalUserId || (report as any)?.assigneeId || (report as any)?.assignedToUserId || "") || undefined, [report]);
  const canOperate = useMemo(() => (!auditor && !!meId && !!assigneeId && assigneeId === meId), [auditor, meId, assigneeId]);

  const loadReport = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await getReportById(id);
      const wr = (data as any)?.whistleReport || data;
      setReport(wr || null);
      try { const list = await getMessages(id, "ALL"); setMessages(Array.isArray(list) ? list : []); } catch {}
      try { const atts = await listReportAttachments(id) as any[]; setAttachments(Array.isArray(atts) ? (atts as AttachmentItem[]) : []); } catch {}
      try {
        const depts = await fetchDeptApi();
        setDeptList(Array.isArray(depts) ? depts : []);
        const deptId = String((wr as any)?.departmentId ?? (wr as any)?.department?.id ?? "");
        if (deptId) {
          const cats = await fetchCatsApi(deptId);
          setCatList(Array.isArray(cats) ? cats : []);
        } else {
          setCatList([]);
        }
      } catch {}
      if (isAdmin) {
        setLoadingUsers(true);
        try {
          const list = await fetchAgentUsersCached();
          setUsers(list);
        } catch {}
        finally {
          setLoadingUsers(false);
        }
      }
    } catch (e: any) {
      const st = e?.response?.status;
      if (!silent) {
        if (st === 404) {
          setToast({ show: true, message: "Non autorizzato o non disponibile", variant: "danger" });
          navigate("/reports", { replace: true });
          return;
        }
        setError(e?.message || "Errore nel caricamento");
      } else {
        setToast({ show: true, message: "Aggiornamento non riuscito", variant: "danger" });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, isAdmin, navigate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const { register: regStatus, handleSubmit: submitStatus, formState: { isSubmitting: statusBusy }, reset: resetStatus, watch: watchStatus } = useForm<StatusForm>({ resolver: zodResolver(StatusSchema), defaultValues: { status: (report?.status as ReportStatus) ?? "OPEN" } });
  useEffect(() => { if (report?.status) resetStatus({ status: report.status as ReportStatus }); }, [report?.status]);
  const { register: regMsg, handleSubmit: submitMsg, reset: resetMsg, formState: { isSubmitting: msgBusy } } = useForm<MessageForm>({ resolver: zodResolver(MessageSchema), defaultValues: { body: "", visibility: "INTERNAL" } });

  const [myNote, setMyNote] = useState<string>("");
  const [myNoteSavedAt, setMyNoteSavedAt] = useState<string | undefined>(undefined);
  const [myNoteSaving, setMyNoteSaving] = useState(false);
  const [myNoteError, setMyNoteError] = useState<string | null>(null);
  const debouncedNote = useDebounced(myNote, 500);
  const canSeeNotes = !auditor;
  useEffect(() => { if (!id || !canSeeNotes) return; (async () => { try { const res = await getMyNote(id); setMyNote((res?.body ?? "") as string); setMyNoteSavedAt(res?.updatedAt); setMyNoteError(null); } catch (e: any) { setMyNote(""); setMyNoteSavedAt(undefined); setMyNoteError(e?.response?.data?.message || e?.message || null); } })(); }, [id, canSeeNotes]);
  useEffect(() => { if (!id || !canSeeNotes || !canOperate) return; (async () => { try { setMyNoteSaving(true); const res = await putMyNote(id, debouncedNote || ""); setMyNoteSavedAt(res?.updatedAt); setMyNoteError(null); } catch (e: any) { setMyNoteError(e?.response?.data?.message || e?.message || "Impossibile salvare la nota"); } finally { setMyNoteSaving(false); } })(); }, [debouncedNote, id, canOperate, canSeeNotes]);

  const userMap = useUserResolver(assigneeId ? [assigneeId] : []);
  const assigneeLabel: string = useMemo(() => {
    if (!assigneeId) return "-";
    const rpt = report as any;
    const reportEmail = rpt?.assignee?.email || rpt?.assignedTo?.email || rpt?.internalUser?.email || rpt?.assigneeEmail || rpt?.assignedToEmail || null;
    if (reportEmail) return String(reportEmail);
    const resolved = (userMap as any)?.[assigneeId];
    if (resolved?.email) return String(resolved.email);
    const listEntry = users.find((u) => String(u.id) === String(assigneeId));
    if (listEntry?.email) return String(listEntry.email);
    if (resolved?.displayName) return String(resolved.displayName);
    if (listEntry?.name) return String(listEntry.name);
    return assigneeId;
  }, [assigneeId, report, userMap, users]);
  const reporterName: string | null = useMemo(() => { const priv = String((report as any)?.privacy || (report as any)?.privacyMode || "").toUpperCase(); if (priv !== "CONFIDENZIALE" && priv !== "CONFIDENTIAL") return null; const n = (report as any)?.reporterName || (report as any)?.reporter?.name || (report as any)?.reporter?.fullName || (report as any)?.reporterFullName || (report as any)?.reporter?.displayName || null; return n ? String(n) : null; }, [report]);

  async function onStatusSubmit(data: StatusForm) {
    try {
      await patchStatus({ reportId: id, status: data.status });
      setToast({ show: true, message: "Stato aggiornato", variant: "success" });
      setReport((prev: any) => ({ ...(prev || {}), status: data.status }));
      await loadReport({ silent: true });
    }
    catch (e: any) { const s = e?.response?.status; if (s === 400) setToast({ show: true, message: "Transizione non consentita", variant: "danger" }); else if (s === 403) setToast({ show: true, message: "Operazione non consentita per il tuo ruolo", variant: "danger" }); else setToast({ show: true, message: "Errore di connessione", variant: "danger" }); }
  }
  async function onMessageSubmit(data: MessageForm) {
    try { await postMessage({ reportId: id, body: data.body, visibility: data.visibility || "INTERNAL" }); const list = await getMessages(id, "ALL"); setMessages(Array.isArray(list) ? list : []); resetMsg({ body: "", visibility: "INTERNAL" }); setToast({ show: true, message: "Messaggio inviato", variant: "success" }); }
    catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: "Operazione non consentita per il tuo ruolo", variant: "danger" }); else setToast({ show: true, message: "Errore di connessione", variant: "danger" }); }
  }

  async function onAssignMeClick() {
    try {
      await assignMe(id);
      setToast({ show: true, message: "Assegnazione a te effettuata", variant: "success" });
      setReport((prev: any) => ({ ...(prev || {}), internalUserId: meId }));
      await loadReport({ silent: true });
    }
    catch (e: any) { const s = e?.response?.status; if (s === 409) setToast({ show: true, message: "Già assegnato a un altro utente", variant: "danger" }); else if (s === 403) setToast({ show: true, message: "Operazione non consentita per il tuo ruolo", variant: "danger" }); else setToast({ show: true, message: "Errore di connessione", variant: "danger" }); }
  }
  async function onTake() {
    try {
      setLoadingTake(true);
      const res = await takeReport(id);
      const taken = (res as any)?.report;
      if (taken) setReport(taken);
      setToast({ show: true, message: (res as any)?.message === "ALREADY_IN_PROGRESS" ? "Già in carico" : "Caso preso in carico", variant: "success" });
      await loadReport({ silent: true });
    }

    catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: "Solo l'assegnatario può prendere in carico", variant: "danger" }); else if (s === 409) setToast({ show: true, message: "Aggiornamento concorrente, riprova", variant: "danger" }); else if (s === 404) setToast({ show: true, message: "Segnalazione non trovata", variant: "danger" }); else setToast({ show: true, message: "Errore inatteso", variant: "danger" }); }
    finally { setLoadingTake(false); }
  }


  function onFilesSelected(files: FileList | null) {
    if (!files || !files.length) return;
    const incoming = Array.from(files);
    const MAX_FILES = Number(import.meta.env.VITE_ATTACH_MAX_FILES || 3);
    const MAX_MB = Number(import.meta.env.VITE_ATTACH_MAX_FILE_MB || 10);
    const MAX_TOTAL_MB = Number(import.meta.env.VITE_ATTACH_MAX_TOTAL_MB || 20);
    const ALLOWED = ["image/png","image/jpeg","application/pdf","text/plain","audio/mpeg","audio/wav"];
    const next = [...pendingFiles, ...incoming];
    const total = next.reduce((s,f)=>s+f.size,0);
    if (next.length > MAX_FILES) { setToast({ show: true, message: `Limiti: max ${MAX_FILES} file`, variant: "danger" }); return; }
    if (total > MAX_TOTAL_MB*1024*1024 || next.some(f => f.size > MAX_MB*1024*1024)) { setToast({ show: true, message: "Limiti: max 3 file, 10 MB ciascuno, 20 MB totali; tipi consentiti: png/jpeg/pdf/txt/mp3/wav.", variant: "danger" }); return; }
    if (incoming.some(f => !ALLOWED.includes(f.type || ""))) { setToast({ show: true, message: "Tipo file non consentito", variant: "danger" }); return; }
    setPendingFiles(next);
  }

  async function savePendingAttachments() {
    if (!pendingFiles.length) return;
    try {
      setUploading(true);
      const toFinalize: Array<{ storageKey: string; fileName: string; mimeType: string; sizeBytes: number; etag?: string }> = [];
      for (const f of pendingFiles) {
        const items = await presignBatch([{ fileName: f.name, mimeType: f.type || "application/octet-stream", sizeBytes: f.size }]);
        const p = Array.isArray(items) ? items[0] : undefined; if (!p) continue;
        const etag = await uploadPresigned(p.uploadUrl, f, p.headers);
        toFinalize.push({ storageKey: p.storageKey, fileName: f.name, mimeType: f.type || "application/octet-stream", sizeBytes: f.size, etag: etag || undefined });
      }
      const fin = await finalizeBatch(toFinalize as any);
      const accepted = Array.isArray(fin?.accepted) ? fin.accepted : toFinalize.map(i => ({ storageKey: i.storageKey }));
      if (accepted.length) {
        const byKey = new Map(toFinalize.map(it => [it.storageKey, it]));
        const toAttach = accepted.map((a: any) => { const k = a?.storageKey || a?.key; const base = byKey.get(k) || ({} as any); return { storageKey: k, fileName: a?.fileName || base.fileName, mimeType: a?.mimeType || base.mimeType, sizeBytes: a?.sizeBytes || base.sizeBytes, etag: a?.etag || base.etag }; });
        try { await attachToReport(id, toAttach as any); setToast({ show: true, message: `Allegati collegati: ${toAttach.length}`, variant: "success" }); setPendingFiles([]); } catch { setToast({ show: true, message: "Errore collegamento allegati", variant: "danger" }); }
      }
      try { const atts = await listReportAttachments(id) as any[]; setAttachments((Array.isArray(atts) ? atts : []) as AttachmentItem[]); } catch {}
    } catch (e: any) {
      const s = e?.response?.status; if (s === 413) setToast({ show: true, message: "Limiti allegati superati", variant: "danger" }); else setToast({ show: true, message: "Errore di connessione. Riprova.", variant: "danger" });
    } finally { setUploading(false); }
  }

  function removePendingAt(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  if (loading) return (<div className="container py-4 d-flex align-items-center" style={{ gap: 8 }}><Spinner animation="border" size="sm" /><span>Caricamento¦</span></div>);
  if (error) return <div className="container py-4 alert alert-danger">{error}</div>;
  if (!report) return <div className="container py-4">Segnalazione non trovata.</div>;

  const titleMasked = auditor ? "â€¢â€¢â€¢â€¢â€¢â€¢" : safeTitle(report);
  const status = String(report.status || "");
  const hasAssignee = !!assigneeId;
  const statusOpen = status.toUpperCase() === "OPEN";

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Dettaglio segnalazione</h3>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <Button variant="outline-secondary" onClick={() => navigate('/reports')}>Indietro</Button>
        </div>
      </div>

      <Card className="shadow-sm mb-3">
        <Card.Header>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center" style={{ gap: 8, minWidth: 0 }}>
              <h5 className="mb-0 text-truncate" title={titleMasked} style={{ maxWidth: '70vw' }}>{titleMasked}</h5>
              <Badge bg={status === 'CLOSED' ? 'success' : 'warning'}>{statusToLabel(status) || '-'}</Badge>
            </div>
            <small>creata il {report.createdAt ? new Date(report.createdAt).toLocaleString() : '-'}</small>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <div className="mb-2"><strong>Dipartimento:</strong> {(() => { const ff = (report as any)?.department?.name || (report as any)?.departmentName; if (ff) return String(ff); const deptId = String((report as any)?.departmentId ?? (report as any)?.department?.id ?? ''); return deptNameMap.get(deptId) || '-'; })()}</div>
              <div className="mb-2"><strong>Categoria:</strong> {(() => { const ff = (report as any)?.category?.name || (report as any)?.categoryName; if (ff) return String(ff); const catId = String((report as any)?.categoryId ?? (report as any)?.category?.id ?? ''); return catNameMap.get(catId) || '-'; })()}</div>
              {!auditor && reporterName && (<div className="mb-2"><strong>Segnalante:</strong> {reporterName}</div>)}
              {auditor && ((report as any)?.reporterAlias || (report as any)?.reporter?.alias) && (<div className="mb-2"><strong>Alias segnalante:</strong> {String((report as any)?.reporterAlias || (report as any)?.reporter?.alias)}</div>)}
            </Col>
            <Col md={6}>
              {!auditor && (
                <Form onSubmit={submitStatus(onStatusSubmit)}>
                  <div className="d-flex align-items-end justify-content-end" style={{ gap: 8 }}>
                    <div>
                      <Form.Label className="fw-semibold mb-1">Stato</Form.Label>
                      <Form.Select size="sm" style={{ minWidth: 200 }} disabled={statusBusy || !canOperate} {...regStatus('status')}>
                        {Object.entries(STATUS_LABELS).map(([val, label]) => {
                          if (hasAssignee && val === 'OPEN') {
                            return (String(status).toUpperCase() === 'OPEN')
                              ? <option key={val} value={val} disabled>{label}</option>
                              : null;
                          }
                          return <option key={val} value={val}>{label}</option>;
                        })}
                      </Form.Select>
                    </div>
                    <Button type="submit" size="sm" variant="dark" disabled={statusBusy || !canOperate || (String(watchStatus('status') || '') === status)}>Aggiorna</Button>
                  </div>
                </Form>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Assegnazione</strong>
          <div className="d-flex align-items-center" style={{ gap: 8 }}>
            {!auditor && !hasAssignee && (<Button size="sm" disabled={assignBusy} onClick={onAssignMeClick}>Assegna a me</Button>)}
            {!auditor && statusOpen && hasAssignee && (<Button size="sm" variant="dark" disabled={assignBusy || loadingTake} onClick={onTake}>{loadingTake ? '...' : 'Prendi in carico'}</Button>)}
          </div>
        </Card.Header>
        <Card.Body>
          <div><strong>Assegnato a:</strong> {assigneeLabel}</div>
          {isAdmin && (
            <div className="d-flex align-items-end mt-3" style={{ gap: 8 }}>
              <Form.Select value={assignUserId} onChange={(e) => setAssignUserId(e.currentTarget.value)} disabled={loadingUsers || assignBusy} style={{ minWidth: 260 }}>
                <option value="">Seleziona utente</option>
                {users.map(u => (<option key={u.id} value={u.id}>{u.email || u.name || u.id}</option>))}
              </Form.Select>
                            <Button size="sm" variant="secondary" disabled={!assignUserId || assignBusy} onClick={async () => { try { setAssignBusy(true); await assign(id, assignUserId); setToast({ show: true, message: 'Assegnazione aggiornata', variant: 'success' }); await loadReport({ silent: true }); } catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Operazione non consentita', variant: 'danger' }); else if (s === 409) setToast({ show: true, message: 'Già assegnato', variant: 'danger' }); else setToast({ show: true, message: 'Errore di connessione', variant: 'danger' }); } finally { setAssignBusy(false); } }}>Assegna</Button>
              <Button size="sm" variant="outline-danger" disabled={assignBusy} onClick={async () => { try { setAssignBusy(true); await unassign(id); setToast({ show: true, message: 'Assegnazione rimossa', variant: 'success' }); await loadReport({ silent: true }); } catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Operazione non consentita', variant: 'danger' }); else setToast({ show: true, message: 'Errore di connessione', variant: 'danger' }); } finally { setAssignBusy(false); } }}>Rimuovi</Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header><strong>Descrizione</strong></Card.Header>
        <Card.Body>
          {renderPlainWithBreaks(auditor ? 'â€¢â€¢â€¢â€¢â€¢â€¢' : ((report as any)?.summary ?? ''))}
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center"><strong>Messaggi</strong></Card.Header>
            <Card.Body>
              <ListGroup>
                {messages.map((m) => (
                  <ListGroup.Item key={(m as any).id}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <Badge bg={String((m as any).visibility || 'INTERNAL').toUpperCase() === 'INTERNAL' ? 'secondary' : 'primary'}>
                          {String((m as any).visibility || 'INTERNAL').toUpperCase()}
                        </Badge>{' '}<strong>{(m as any)?.author || '-'}</strong>
                      </div>
                      <small>{new Date((m as any).createdAt).toLocaleString()}</small>
                    </div>
                    <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{auditor ? 'â€¢â€¢â€¢â€¢â€¢â€¢' : ((m as any)?.body || '')}</div>
                  </ListGroup.Item>
                ))}
                {messages.length === 0 && (<div className="text-muted">Nessun messaggio.</div>)}
              </ListGroup>
            </Card.Body>
          </Card>

          {!auditor && canOperate && (
            <Card className="shadow-sm mt-3">
              <Card.Header><strong>Nuovo messaggio</strong></Card.Header>
              <Card.Body>
                <Form onSubmit={submitMsg(onMessageSubmit)}>
                  <Row className="g-2">
                    <Col md={9}><Form.Control as="textarea" rows={3} placeholder="Scrivi un messaggio" disabled={msgBusy} {...regMsg('body')} /></Col>
                    <Col md={3}>
                      <Form.Select disabled={msgBusy} {...regMsg('visibility')} defaultValue={'INTERNAL'}>
                        <option value="INTERNAL">INTERNAL</option>
                        <option value="PUBLIC">PUBLIC</option>
                      </Form.Select>
                      <div className="mt-2 d-flex justify-content-end"><Button type="submit" disabled={msgBusy} variant="dark">Invia</Button></div>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Header><strong>Allegati</strong></Card.Header>
            <Card.Body>
              {!auditor && canOperate && (
                <div className="mb-3">
                  <Form.Group controlId="fileUpload">
                    <Form.Control type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.txt,.mp3,.wav" disabled={uploading} onChange={(e) => onFilesSelected((e.currentTarget as HTMLInputElement).files)} />
                  </Form.Group>
                  {!!pendingFiles.length && (
                    <ListGroup className="mt-2">
                      {pendingFiles.map((f, i) => (
                        <ListGroup.Item key={`${f.name}-${i}`} className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>{f.name}</div>
                            <small className="text-muted">{(f.size/1024).toFixed(0)} KB • {(f.type || 'application/octet-stream')}</small>
                          </div>
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="outline-danger" onClick={() => removePendingAt(i)}>Rimuovi</Button>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">Max 3 file, 10MB ciascuno, 20MB totali</small>
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="outline-secondary" disabled={uploading || pendingFiles.length === 0} onClick={() => setPendingFiles([])}>Svuota</Button>
                      <Button size="sm" variant="dark" disabled={uploading || pendingFiles.length === 0} onClick={savePendingAttachments}>{uploading ? '...' : 'Salva'}</Button>
                    </div>
                  </div>
                </div>
              )}
              <div>
                {attachments.length === 0 ? (
                  <div className="text-muted">Nessun allegato disponibile</div>
                ) : (
                  <ListGroup>
                    {attachments.map((a) => (
                      <ListGroup.Item key={a.id} className="d-flex justify-content-between align-items-center">
                        <div>
                          {!auditor && (<div className="fw-semibold">{(a as any).fileName}</div>)}
                          <small className="text-muted">{(a as any).mimeType || (a as any)["mime"]} Â· {((a as any).sizeBytes/1024).toFixed(0)} KB</small>
                        </div>
                        <div>
                          {auditor ? (
                            <Button size="sm" variant="outline-primary" onClick={async () => { try { const blob = await previewAttachment(id, a.id); setPreviewBlob(blob); setPreviewMime(String((a as any).mimeType || '')); setPreviewOpen(true); } catch (e: any) { const s = e?.status || e?.response?.status; if (s === 403) setToast({ show: true, message: 'Operazione non consentita per il tuo ruolo', variant: 'danger' }); else if (s === 404) setToast({ show: true, message: 'Allegato non disponibile', variant: 'danger' }); else setToast({ show: true, message: 'Anteprima non disponibile', variant: 'danger' }); } }}>Anteprima</Button>
                          ) : (
                            <Button size="sm" variant="outline-secondary" onClick={async () => { try { const blob = await dlAttachment(id, a.id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = (a as any).fileName || 'attachment'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); } catch { setToast({ show: true, message: 'Download non riuscito', variant: 'danger' }); } }}>Scarica</Button>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </Card.Body>
          </Card>

          {canSeeNotes && (
            <Card className="shadow-sm mt-3">
              <Card.Header><strong>Le mie note</strong></Card.Header>
              <Card.Body>
                <Form.Group controlId="myNotes">
                  <Form.Control as="textarea" rows={6} placeholder="Appunti personali sul caso. (visibili solo a te)" value={myNote} onChange={(e) => setMyNote(e.currentTarget.value)} disabled={!canOperate} />
                </Form.Group>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-muted">{myNoteSaving ? 'Salvataggio¦' : myNoteSavedAt ? `Salvata alle ${new Date(myNoteSavedAt).toLocaleTimeString()}` : '-'}{myNoteError ? ` Â· ${myNoteError}` : ''}</small>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-secondary" disabled={!canOperate || (!myNote || myNote.trim() === '') || myNoteSaving} onClick={async () => { try { setMyNoteSaving(true); await deleteMyNote(id); setMyNote(''); setMyNoteSavedAt(undefined); setMyNoteError(null); } catch (e: any) { setMyNoteError(e?.response?.data?.message || e?.message || 'Errore cancellazione'); } finally { setMyNoteSaving(false); } }}>Svuota</Button>
                    <Button size="sm" variant="dark" disabled={!canOperate || myNoteSaving} onClick={async () => { try { setMyNoteSaving(true); const res = await putMyNote(id, myNote || ''); setMyNoteSavedAt(res?.updatedAt); setMyNoteError(null); } catch (e: any) { setMyNoteError(e?.response?.data?.message || e?.message || 'Errore salvataggio'); } finally { setMyNoteSaving(false); } }}>Salva</Button>
                  </div>
                </div>
                {!canOperate && (<div className="text-muted small mt-2">Diventa assegnatario per modificare le note.</div>)}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.variant === 'danger' ? 'danger' : toast.variant === 'success' ? 'success' : 'primary'} onClose={() => setToast({ ...toast, show: false })} show={toast.show} delay={3000} autohide>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      <AttachmentPreviewModal open={previewOpen} blob={previewBlob} mime={previewMime} viewerEmail={user?.email || ''} onClose={() => { setPreviewOpen(false); setPreviewBlob(undefined); }} />
    </div>
  );
}







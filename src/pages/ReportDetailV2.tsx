// src/pages/ReportDetailV2.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, Col, Form, ListGroup, Row, Spinner, Toast, ToastContainer } from "react-bootstrap";
import { useAuth } from "@/context/AuthContext";
import { fetchDepartments as fetchDeptApi } from "@/lib/departments.api";
import { fetchCategories as fetchCatsApi } from "@/lib/categories.api";
import {
  getReportById,
  getMessages,
  postMessage,
  patchStatus,
  assignMe,
  assign,
  unassign,
  takeReport,
  patchMessageBody,
  patchMessageNote,
  type AttachmentItem,
  type ReportStatus,
  type Message,
} from "@/lib/reports.v2.service";
import { uploadPresigned } from "@/lib/attachments.service";
import { useUserResolver } from "@/lib/useUserResolver";
import { stripSystemPrefix, buildUserIndex, replaceUserIds, systemSideLabel } from "@/lib/messages.format";
import { listReportAttachments, downloadAttachment as dlAttachment, presign as presignBatch, finalize as finalizeBatch, attachToReport } from "@/lib/reportAttachments.service";
import UserSelect from "@/components/UserSelect";

// Helpers risoluzione nomi reparto/categoria senza nuove chiamate
function getDepartmentName(report: any, departments?: any[], deptOptions?: any[]) {
  const direct = report?.department?.name || report?.departmentName;
  if (direct) return String(direct);
  const src = (departments || deptOptions || []) as any[];
  const byId = src.find((d) => String(d?.id ?? d?.value) === String(report?.departmentId));
  const name = (byId as any)?.name ?? (byId as any)?.label;
  return name ? String(name) : "—";
}

function getCategoryName(report: any, departments?: any[], categoryOptions?: any[]) {
  const direct = report?.category?.name || report?.categoryName;
  if (direct) return String(direct);
  const catId = (report as any)?.categoryId;
  if (!catId) return "—";
  for (const c of ((categoryOptions || []) as any[])) {
    const id = (c as any)?.id ?? (c as any)?.value;
    const name = (c as any)?.name ?? (c as any)?.label;
    if (id != null && String(id) === String(catId)) return String(name ?? "—");
  }
  for (const d of ((departments || []) as any[])) {
    const cats = (d as any)?.categories || (d as any)?.items || [];
    for (const c of cats) {
      const id = (c as any)?.id ?? (c as any)?.value;
      const name = (c as any)?.name ?? (c as any)?.label;
      if (id != null && String(id) === String(catId)) return String(name ?? "—");
    }
  }
  return "—";
}

function renderPlainWithBreaks(s?: string | null) {
  if (!s) return <span className="text-muted">�</span>;
  const safe = String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return <span dangerouslySetInnerHTML={{ __html: safe.replace(/\n/g, "<br/>") }} />;
}

const STATUS_VALUES: ReportStatus[] = ["OPEN","IN_PROGRESS","SUSPENDED","NEED_INFO","CLOSED"];

function extractUserIdFromText(text?: string): string | undefined {
  if (!text) return;
  const m = String(text || "").match(/\bcmh[0-9a-z]{10,}\b/i);
  return m ? m[0] : undefined;
}

function getReportTitle(r?: any) {
  const t = r?.title?.trim?.();
  const s = r?.summary?.trim?.(); // fallback
  return t || s || "—";
}

const StatusSchema = z.object({
  status: z.enum(["OPEN","IN_PROGRESS","SUSPENDED","NEED_INFO","CLOSED"]),
  note: z.string().max(1000).optional(),
});
type StatusForm = z.infer<typeof StatusSchema>;

const MessageSchema = z.object({
  body: z.string().min(1).max(5000),
  visibility: z.enum(["PUBLIC","INTERNAL"]).optional(),
});
type MessageForm = z.infer<typeof MessageSchema>;

export default function ReportDetailV2() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deptName, setDeptName] = useState<string>("-");
  const [catName, setCatName] = useState<string>("-");
  const [deptList, setDeptList] = useState<any[]>([]);
  const [catList, setCatList] = useState<any[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "primary" | "success" | "danger" }>(
    { show: false, message: "", variant: "primary" }
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email?: string; name?: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [loadingTake, setLoadingTake] = useState(false);

  const isAdmin = (user?.role === 'admin' || user?.role === 'superhost');
  const isAgent = (user?.role === 'agent');
  const meId = user?.id ? String(user.id) : undefined;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReportById(id);
        const wr = (data as any)?.whistleReport || data;
        setReport(wr || null);
        // messages asc possono arrivare già nel dettaglio; se non presenti, fetch separato
        const msgs = Array.isArray((data as any)?.messages) ? (data as any).messages : await getMessages(id, 'ALL');
        setMessages(msgs as Message[]);
        // labels
        try {
          const depts = await fetchDeptApi();
          setDeptList(Array.isArray(depts) ? depts : []);
          const dmap = new Map((depts || []).map((d: any) => [d.id, d.name]));
          setDeptName(dmap.get(String(wr?.departmentId || '')) || '-');
          const cats = await fetchCatsApi(String(wr?.departmentId || ''));
          setCatList(Array.isArray(cats) ? cats : []);
          const cmap = new Map((cats || []).map((c: any) => [c.id, c.name]));
          setCatName(cmap.get(String(wr?.categoryId || '')) || '-');
        } catch { /* ignore */ }
        // attachments list (tenant)
        try {
          const atts = await listReportAttachments(id) as any[];
          setAttachments((Array.isArray(atts) ? atts : []) as AttachmentItem[]);
        } catch { /* ignore */ }
        // users (admin)
        try {
          if (isAdmin) {
            setLoadingUsers(true);
            const { fetchAgentUsersCached } = await import("@/lib/reports.v2.service");
            const list = await fetchAgentUsersCached();
            setUsers(list);
          }
        } catch { /* ignore */ } finally { setLoadingUsers(false); }
      } catch (e: any) {
        setError(e?.message || 'Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // --- User resolver (assignee + SYSTEM assign messages, robust) ---
  const candidateAssigneeIdFromDetail: string | undefined =
    (report as any)?.internalUserId ?? (report as any)?.assigneeId ?? (report as any)?.assignedToUserId ?? undefined;

  const assignMessages = useMemo(() => {
    const list = Array.isArray(messages) ? messages.slice() : [];
    const filtered = list.filter((m: any) =>
      m?.type === "SYSTEM" && (
        m?.systemKind?.toUpperCase?.().includes("ASSIGN") ||
        /assegnat[oa]\s+a\s+utente/i.test(m?.body || (m as any)?.text || "") ||
        /assigned\s+to\s+user/i.test(m?.body || (m as any)?.text || "")
      )
    );
    filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [JSON.stringify(messages)]);

  const lastAssign: any | undefined = assignMessages[0];
  const candidateAssigneeIdFromMessage: string | undefined =
    lastAssign?.payload?.assigneeId ||
    lastAssign?.payload?.targetUserId ||
    extractUserIdFromText(lastAssign?.body || (lastAssign as any)?.text);

  const effectiveAssigneeId: string | undefined =
    (candidateAssigneeIdFromDetail as string | undefined) ||
    (candidateAssigneeIdFromMessage as string | undefined) ||
    undefined;

  const idsToResolve = useMemo(() => {
    const ids: Array<string | undefined> = [
      effectiveAssigneeId,
      ...assignMessages.map((m: any) =>
        m?.payload?.assigneeId ||
        m?.payload?.targetUserId ||
        extractUserIdFromText(m?.body || (m as any)?.text)
      ),
    ];
    return (ids.filter(Boolean) as string[]);
  }, [effectiveAssigneeId, JSON.stringify(assignMessages)]);

  const userMap = useUserResolver(idsToResolve);
  const userIndex = useMemo(() => buildUserIndex(report, user), [report, user]);

  // Descrizione (read-only)
  const descriptionText: string = (report as any)?.summary ?? "";

  // Status form
  const { register: regStatus, handleSubmit: submitStatus, formState: { isSubmitting: statusBusy } , reset: resetStatus } = useForm<StatusForm>({
    resolver: zodResolver(StatusSchema),
    defaultValues: { status: (report?.status as ReportStatus) ?? 'OPEN', note: '' },
  });
  useEffect(() => {
    if (report?.status) resetStatus({ status: report.status as ReportStatus, note: '' });
  }, [report?.status]);

  async function onStatusSubmit(data: StatusForm) {
    try {
      await patchStatus({ reportId: id, status: data.status, note: data.note });
      setToast({ show: true, message: 'Stato aggiornato', variant: 'success' });
      // refresh minimale: aggiorna report.status
      setReport((prev: any) => ({ ...(prev || {}), status: data.status }));
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 400) setToast({ show: true, message: 'Transizione non consentita (SLA)', variant: 'danger' });
      else if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' });
      else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' });
    }
  }

  // Message form
  const { register: regMsg, handleSubmit: submitMsg, reset: resetMsg, formState: { isSubmitting: msgBusy } } = useForm<MessageForm>({
    resolver: zodResolver(MessageSchema),
    defaultValues: { body: '', visibility: 'INTERNAL' },
  });
  async function onMessageSubmit(data: MessageForm) {
    try {
      await postMessage({ reportId: id, body: data.body, visibility: data.visibility || 'INTERNAL' });
      // refresh messages
      const list = await getMessages(id, 'ALL');
      setMessages(list as Message[]);
      resetMsg({ body: '', visibility: 'INTERNAL' });
      setToast({ show: true, message: 'Messaggio inviato', variant: 'success' });
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' });
      else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' });
    }
  }

  // Assign/Unassign
  async function onAssignMe() {
    try {
      await assignMe(id);
      setToast({ show: true, message: 'Presa in carico effettuata', variant: 'success' });
      setReport((prev: any) => ({ ...(prev || {}), assigneeId: 'me' }));
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 409) setToast({ show: true, message: 'Segnalazione già assegnata a un altro utente.', variant: 'danger' });
      else if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' });
      else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' });
    }
  }
  const [assignUserId, setAssignUserId] = useState<string>("");
  async function onAssignUser() {
    if (!assignUserId) return;
    try { await assign(id, assignUserId); setToast({ show: true, message: 'Assegnazione aggiornata', variant: 'success' }); }
    catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' }); else if (s === 409) setToast({ show: true, message: 'Gi� assegnato a un altro utente', variant: 'danger' }); else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' }); }
  }
  async function onUnassign() {
    try { await unassign(id); setToast({ show: true, message: 'Assegnazione rimossa', variant: 'success' }); }
    catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' }); else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' }); }
  }

  async function refetchReport() {
    try {
      const data = await getReportById(id);
      const wr = (data as any)?.whistleReport || data;
      setReport(wr || null);
    } catch {}
  }

  async function handleTake() {
    try {
      const res = await takeReport(id);
      const taken = (res as any)?.report;
      if (taken) setReport(taken);
      // rifresca per allineare altri pannelli/campi derivati
      await refetchReport();
      setToast({ show: true, message: (res as any)?.message === 'ALREADY_IN_PROGRESS' ? 'Già in carico' : 'Caso preso in carico', variant: 'success' });
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 403) setToast({ show: true, message: 'Solo l’assegnatario può prendere in carico', variant: 'danger' });
      else if (s === 409) setToast({ show: true, message: 'Aggiornamento concorrente, riprova', variant: 'danger' });
      else if (s === 404) setToast({ show: true, message: 'Segnalazione non trovata', variant: 'danger' });
      else if (s === 400) setToast({ show: true, message: 'Stato non coerente o dati mancanti', variant: 'danger' });
      else setToast({ show: true, message: 'Errore inatteso', variant: 'danger' });
    }
  }

  // Attachments
  const [uploading, setUploading] = useState(false);
  const ALLOW_UNSCANNED_DOWNLOAD = String(import.meta.env.VITE_ALLOW_UNSCANNED_DOWNLOAD || '').toLowerCase() === 'true';
  async function onFilesSelected(files: FileList | null) {
    if (!files || !files.length) return;
    const arr = Array.from(files);
    // Validazioni: max 3 file, 10MB ciascuno, 20MB totali, MIME: png/jpeg/pdf/txt
    const MAX_FILES = Number(import.meta.env.VITE_ATTACH_MAX_FILES || 3);
    const MAX_MB = Number(import.meta.env.VITE_ATTACH_MAX_FILE_MB || 10);
    const MAX_TOTAL_MB = Number(import.meta.env.VITE_ATTACH_MAX_TOTAL_MB || 20);
    const ALLOWED = ["image/png","image/jpeg","application/pdf","text/plain","audio/mpeg","audio/wav"];
    if (arr.length > MAX_FILES) { setToast({ show: true, message: `Limiti: max ${MAX_FILES} file`, variant: 'danger' }); return; }
    const total = arr.reduce((s,f)=>s+f.size,0);
    if (total > MAX_TOTAL_MB*1024*1024 || arr.some(f => f.size > MAX_MB*1024*1024)) {
      setToast({ show: true, message: "Limiti: max 3 file, 10 MB ciascuno, 20 MB totali; tipi consentiti: png/jpeg/pdf/txt/mp3/wav.", variant: 'danger' });
      return;
    }
    if (arr.some(f => !ALLOWED.includes(f.type || ''))) {
      setToast({ show: true, message: "Tipo file non consentito", variant: 'danger' });
      return;
    }
    try {
      setUploading(true);
      // 1) presign + PUT (per ogni file)
      const toFinalize: Array<{ storageKey: string; fileName: string; mimeType: string; sizeBytes: number; etag?: string }> = [];
      for (const f of arr) {
        const items = await presignBatch([{ fileName: f.name, mimeType: f.type || 'application/octet-stream', sizeBytes: f.size }]);
        const p = Array.isArray(items) ? items[0] : undefined;
        if (!p) { continue; }
        const etag = await uploadPresigned(p.uploadUrl, f, p.headers);
        toFinalize.push({ storageKey: p.storageKey, fileName: f.name, mimeType: f.type || 'application/octet-stream', sizeBytes: f.size, etag: etag || undefined });
      }
      // 2) finalize TMP (batch)
      const fin = await finalizeBatch(toFinalize as any);
      const accepted = Array.isArray(fin?.accepted) ? fin.accepted : [];
      const rejected = Array.isArray(fin?.rejected) ? fin.rejected : [];
      if (rejected.length) {
        try { setToast({ show: true, message: `Alcuni file rifiutati: ${rejected.map((r: any) => r?.reason || r?.storageKey || '?').join(', ')}`, variant: 'danger' }); } catch {}
      }
      // 3) attach-to-report solo per gli accepted
      if (accepted.length) {
        const byKey = new Map(toFinalize.map(it => [it.storageKey, it]));
        const toAttach = accepted.map((a: any) => {
          const k = a?.storageKey || a?.key;
          const base = byKey.get(k) || {} as any;
          return {
            storageKey: k,
            fileName: a?.fileName || base.fileName,
            mimeType: a?.mimeType || base.mimeType,
            sizeBytes: a?.sizeBytes || base.sizeBytes,
            etag: a?.etag || base.etag,
          };
        });
        try {
          const res = await attachToReport(id, toAttach as any);
          const createdN = (res?.created || []).length;
          const existingN = (res?.existing || []).length;
          if (createdN) setToast({ show: true, message: `Allegati collegati: ${createdN}`, variant: 'success' });
          if (existingN) setToast({ show: true, message: `Già presenti: ${existingN}`, variant: 'primary' });
        } catch {
          setToast({ show: true, message: 'Errore collegamento allegati', variant: 'danger' });
        }
      }
      // 4) Refresh lista allegati dopo upload
      try { const atts = await listReportAttachments(id) as any[]; setAttachments((Array.isArray(atts) ? atts : []) as AttachmentItem[]); } catch { /* ignore */ }
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 413) setToast({ show: true, message: 'Limiti allegati superati', variant: 'danger' });
      else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' });
    } finally {
      setUploading(false);
    }
  }

  const shownMessages = useMemo(() => { const list = Array.isArray(messages) ? messages.slice() : []; list.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); return list; }, [messages]);

  if (loading) {
    return (
      <div className="container py-4 d-flex align-items-center" style={{ gap: 8 }}>
        <Spinner animation="border" size="sm" />
        <span>Caricamento…</span>
      </div>
    );
  }
  if (error) return <div className="container py-4 alert alert-danger">{error}</div>;
  if (!report) return <div className="container py-4">Segnalazione non trovata.</div>;

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
              <h5
                className="mb-0 text-truncate"
                title={String(report?.title || report?.summary || '')}
                style={{ maxWidth: '70vw' }}
              >
                {getReportTitle(report)}
              </h5>
              <Badge bg={String(report.status) === 'CLOSED' ? 'success' : 'warning'}>{String(report.status || '-')}</Badge>
            </div>
            <small>creata il {new Date(report.createdAt).toLocaleString()}</small>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <div className="mb-2 text-muted">
                <small>
                  Dipartimento: {deptName} — Categoria: {catName}
                </small>
              </div>
              <div className="mb-2"><strong>Canale:</strong> {String(report.channel || report.source || 'OTHER')}</div>
              <div className="mb-2"><strong>Privacy:</strong> {String(report.privacy || '-')}</div>
              <div className="mb-2"><strong>Reparto:</strong> {getDepartmentName(report, deptList)}</div>
              <div className="mb-2"><strong>Categoria:</strong> {getCategoryName(report, deptList, catList)}</div>
              {String(report.privacy || '') === 'CONFIDENZIALE' && (report as any)?.reporterName ? (
                <div className="mb-2"><strong>Segnalante:</strong> {String((report as any).reporterName)}</div>
              ) : null}
            </Col>
            <Col md={6}>
              <Form onSubmit={submitStatus(onStatusSubmit)}>
                <Row className="g-2 align-items-end">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Stato</Form.Label>
                      <Form.Select disabled={statusBusy} {...regStatus('status')}>
                        {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Nota (opzionale)</Form.Label>
                      <Form.Control type="text" placeholder="Aggiungi nota" disabled={statusBusy} {...regStatus('note')} />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Button type="submit" disabled={statusBusy} variant="dark">Aggiorna stato</Button>
                  </Col>
                </Row>
              </Form>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Assegnazione</strong>
          <div className="d-flex align-items-center" style={{ gap: 8 }}>
            {(() => {
              const assignee = String((report as any)?.internalUserId || (report as any)?.assigneeId || (report as any)?.assignedToUserId || "");
              const hasAssignee = !!assignee;
              const statusOpen = String((report as any)?.status || '').toUpperCase() === 'OPEN';
              const resolvedEmail = assignee ? (userMap[assignee]?.email || userMap[assignee]?.displayName) : undefined;
              const meEmail = user?.email ? String(user.email).toLowerCase().trim() : undefined;
              const canTake = isAgent && statusOpen && hasAssignee && (
                (!!meId && assignee === meId) ||
                (!!meEmail && !!resolvedEmail && String(resolvedEmail).toLowerCase().trim() === meEmail) ||
                (!meId) ||
                (!resolvedEmail)
              );
              return (
                <>
                  {(isAgent && !hasAssignee) && (
                    <Button size="sm" disabled={assignBusy} onClick={async () => { try { setAssignBusy(true); await onAssignMe(); } finally { setAssignBusy(false); } }}>
                      {assignBusy ? '...' : 'Assegna a me'}
                    </Button>
                  )}
                  {(canTake) && (
                    <Button size="sm" variant="dark" disabled={assignBusy || loadingTake} onClick={async () => { try { setLoadingTake(true); await handleTake(); } finally { setLoadingTake(false); } }} className="ms-2">
                      {loadingTake ? '...' : 'Prendi in carico'}
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              {(() => {
                const assId = effectiveAssigneeId || String((report as any)?.internalUserId || (report as any)?.assigneeId || (report as any)?.assignedToUserId || "");
                const resolved = assId && (userMap[assId]?.email || userMap[assId]?.displayName);
                const assigneeLabel =
                  (assId && (
                    (meId && assId === meId && user?.email) ||
                    resolved ||
                    (isAgent ? (user?.email || "me") : undefined)
                  )) ||
                  assId ||
                  "-";
                return <div><strong>Assegnato a:</strong> {assigneeLabel}</div>;
              })()}
            </div>
            {isAdmin && (
              <div className="d-flex align-items-end" style={{ gap: 8 }}>
                <div style={{ minWidth: 260 }}>
                  <UserSelect users={users} value={assignUserId} onChange={setAssignUserId} loading={loadingUsers} disabled={assignBusy || loadingUsers} />
                </div>
                <Button size="sm" variant="secondary" disabled={assignBusy || !assignUserId} onClick={async () => { try { setAssignBusy(true); await onAssignUser(); } finally { setAssignBusy(false); } }}>
                  {assignBusy ? '...' : 'Assegna'}
                </Button>
                <Button size="sm" variant="outline-danger" disabled={assignBusy} onClick={async () => { try { setAssignBusy(true); await onUnassign(); } finally { setAssignBusy(false); } }}>
                  {assignBusy ? '...' : 'Rimuovi'}
                </Button>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* === Descrizione (READ-ONLY) === */}
      <Card className="shadow-sm mb-3">
        <Card.Header>
          <strong>Descrizione</strong>
        </Card.Header>
        <Card.Body>
          {renderPlainWithBreaks(descriptionText)}
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Messaggi</strong>
            </Card.Header>
            <Card.Body>
              <ListGroup>
                {shownMessages.map((m) => (
                  <ListGroup.Item key={(m as any).id}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        {(() => {
                          const vis = String((m as any).visibility || "").toUpperCase();
                          const isSystem = vis === "SYSTEM" || String((m as any).type || "").toUpperCase() === "SYSTEM";
                          if (isSystem) {
                            const side = systemSideLabel(m as any);
                            return (
                              <>
                                <Badge bg={"warning"}>SYSTEM</Badge>{" "}
                                {side ? <small className="text-muted text-uppercase fw-semibold">{side}</small> : null}
                              </>
                            );
                          }
                          return (
                            <>
                              <Badge bg={vis === "INTERNAL" ? "secondary" : "primary"}>{vis || "INTERNAL"}</Badge>{" "}
                              <strong>{(m as any)?.author || "-"}</strong>
                            </>
                          );
                        })()}
                      </div>
                      <small>{new Date((m as any).createdAt).toLocaleString()}</small>
                    </div>
                    {(() => {
                      const vis = String((m as any)?.visibility || "").toUpperCase();
                      const isSystem = vis === "SYSTEM" || String((m as any)?.type || "").toUpperCase() === "SYSTEM";
                      const bodyText = (m as any)?.body || (m as any)?.text || "";
                      if (isSystem) {
                        const cleaned = stripSystemPrefix(bodyText);
                        const replaced = replaceUserIds(cleaned, userIndex);
                        return <div className="mt-1" style={{ whiteSpace: "pre-wrap" }}>{replaced || "—"}</div>;
                      }
                      return <div className="mt-1" style={{ whiteSpace: "pre-wrap" }}>{bodyText || "—"}</div>;
                    })()}
                  </ListGroup.Item>
                ))}
                {shownMessages.length === 0 && (
                  <div className="text-muted">Nessun messaggio.</div>
                )}
              </ListGroup>
            </Card.Body>
          </Card>

          {(isAdmin || isAgent) && (
            <Card className="shadow-sm mt-3">
              <Card.Header><strong>Nuovo messaggio</strong></Card.Header>
              <Card.Body>
                <Form onSubmit={submitMsg(onMessageSubmit)}>
                  <Row className="g-2">
                    <Col md={9}>
                      <Form.Control as="textarea" rows={3} placeholder="Scrivi un messaggio" disabled={msgBusy} {...regMsg('body')} />
                    </Col>
                    <Col md={3}>
                      <Form.Select disabled={msgBusy} {...regMsg('visibility')} defaultValue={'INTERNAL'}>
                        <option value="INTERNAL">INTERNAL</option>
                        <option value="PUBLIC">PUBLIC</option>
                      </Form.Select>
                      <div className="mt-2 d-flex justify-content-end">
                        <Button type="submit" disabled={msgBusy} variant="dark">Invia</Button>
                      </div>
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
              <Form.Group controlId="fileUpload">
                <Form.Control type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.txt,.mp3,.wav" disabled={uploading} onChange={(e) => onFilesSelected((e.currentTarget as HTMLInputElement).files)} />
              </Form.Group>
              <small className="text-muted d-block mt-2">Max 3 file, 10MB ciascuno, 20MB totali</small>
              <hr />
              <div>
                <div className="fw-semibold mb-2">Allegati caricati</div>
                {attachments.length === 0 ? (
                  <div className="text-muted">Nessun allegato disponibile</div>
                ) : (
                  <ListGroup>
                    {attachments.map((a) => (
                      <ListGroup.Item key={a.id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{a.fileName}</div>
                          <small className="text-muted">{a.mimeType} � {(a.sizeBytes/1024).toFixed(0)} KB � {(a as any).status ? String((a as any).status).toUpperCase() : "UPLOADED"}</small>
                        </div>
                        <div>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={
                              ["CLEAN", "UPLOADED"].includes(String((a as any).status || "UPLOADED").toUpperCase())
                                ? false
                                : !ALLOW_UNSCANNED_DOWNLOAD
                            }
                            onClick={async () => {
                              try {
                                const blob = await dlAttachment(id, a.id);
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = a.fileName || "attachment";
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                URL.revokeObjectURL(url);
                              } catch {
                                setToast({ show: true, message: "Download non riuscito", variant: "danger" });
                              }
                            }}
                          >
                            Scarica
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.variant === 'danger' ? 'danger' : toast.variant === 'success' ? 'success' : 'primary'} onClose={() => setToast({ ...toast, show: false })} show={toast.show} delay={3000} autohide>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}





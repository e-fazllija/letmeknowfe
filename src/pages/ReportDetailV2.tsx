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
  patchMessageBody,
  patchMessageNote,
  getAttachments,
  buildAttachmentDownloadUrl,
  type AttachmentItem,
  type ReportStatus,
  type Message,
} from "@/lib/reports.v2.service";
import { finalizeAttachment, presignAttachment, uploadPresigned } from "@/lib/attachments.service";
import UserSelect from "@/components/UserSelect";

const STATUS_VALUES: ReportStatus[] = ["OPEN","IN_PROGRESS","SUSPENDED","NEED_INFO","CLOSED"];

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
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "primary" | "success" | "danger" }>(
    { show: false, message: "", variant: "primary" }
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email?: string; name?: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const isAdmin = (user?.role === 'admin' || user?.role === 'superhost');
  const isAgent = (user?.role === 'agent');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReportById(id);
        const wr = (data as any)?.whistleReport || data;
        setReport(wr || null);
        // messages asc possono arrivare giÃ  nel dettaglio; se non presenti, fetch separato
        const msgs = Array.isArray((data as any)?.messages) ? (data as any).messages : await getMessages(id, 'ALL');
        setMessages(msgs as Message[]);
        // labels
        try {
          const depts = await fetchDeptApi();
          const dmap = new Map(depts.map(d => [d.id, d.name]));
          setDeptName(dmap.get(String(wr?.departmentId || '')) || '-');
          const cats = await fetchCatsApi(String(wr?.departmentId || ''));
          const cmap = new Map((cats || []).map((c: any) => [c.id, c.name]));
          setCatName(cmap.get(String(wr?.categoryId || '')) || '-');
        } catch { /* ignore */ }
        // attachments list (tenant)
        try {
          const atts = await getAttachments(id);
          setAttachments(atts || []);
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
      if (s === 409) setToast({ show: true, message: 'Segnalazione giÃ  assegnata a un altro utente.', variant: 'danger' });
      else if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' });
      else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' });
    }
  }
  const [assignUserId, setAssignUserId] = useState<string>("");
  async function onAssignUser() {
    if (!assignUserId) return;
    try { await assign(id, assignUserId); setToast({ show: true, message: 'Assegnazione aggiornata', variant: 'success' }); }
    catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' }); else if (s === 409) setToast({ show: true, message: 'Già assegnato a un altro utente', variant: 'danger' }); else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' }); }
  }
  async function onUnassign() {
    try { await unassign(id); setToast({ show: true, message: 'Assegnazione rimossa', variant: 'success' }); }
    catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Permessi insufficienti', variant: 'danger' }); else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' }); }
  }

  // Attachments
  const [uploading, setUploading] = useState(false);
  async function onFilesSelected(files: FileList | null) {
    if (!files || !files.length) return;
    const arr = Array.from(files);
    // Validazioni: max 3 file, 10MB ciascuno, 20MB totali, MIME: png/jpeg/pdf/txt
    const MAX_FILES = Number(import.meta.env.VITE_ATTACH_MAX_FILES || 3);
    const MAX_MB = Number(import.meta.env.VITE_ATTACH_MAX_FILE_MB || 10);
    const MAX_TOTAL_MB = Number(import.meta.env.VITE_ATTACH_MAX_TOTAL_MB || 20);
    const ALLOWED = ["image/png","image/jpeg","application/pdf","text/plain"];
    if (arr.length > MAX_FILES) { setToast({ show: true, message: `Limiti: max ${MAX_FILES} file`, variant: 'danger' }); return; }
    const total = arr.reduce((s,f)=>s+f.size,0);
    if (total > MAX_TOTAL_MB*1024*1024 || arr.some(f => f.size > MAX_MB*1024*1024)) {
      setToast({ show: true, message: "Limiti: max 3 file, 10 MB ciascuno, 20 MB totali; tipi consentiti: png/jpeg/pdf/txt.", variant: 'danger' });
      return;
    }
    if (arr.some(f => !ALLOWED.includes(f.type || ''))) {
      setToast({ show: true, message: "Tipo file non consentito", variant: 'danger' });
      return;
    }
    try {
      setUploading(true);
      for (const f of arr) {
        const p = await presignAttachment({ fileName: f.name, mimeType: f.type || 'application/octet-stream', sizeBytes: f.size });
        const etag = await uploadPresigned(p.uploadUrl, f, p.headers);
        await finalizeAttachment({ storageKey: p.storageKey, sizeBytes: f.size, fileName: f.name, mimeType: f.type || 'application/octet-stream', etag: etag || undefined, proof: p.proof });
      }
      // Refresh lista allegati dopo upload
      try { const atts = await getAttachments(id); setAttachments(atts || []); } catch { /* ignore */ }
      setToast({ show: true, message: 'Allegati caricati', variant: 'success' });
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 413) setToast({ show: true, message: 'Limiti allegati superati', variant: 'danger' });
      else setToast({ show: true, message: 'Errore di connessione. Riprova.', variant: 'danger' });
    } finally {
      setUploading(false);
    }
  }

  const shownMessages = useMemo(() => messages, [messages]);

  if (loading) {
    return (
      <div className="container py-4 d-flex align-items-center" style={{ gap: 8 }}>
        <Spinner animation="border" size="sm" />
        <span>Caricamentoâ€¦</span>
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
            <div>
              <strong>{report.id || report.reportId}</strong>{' '}
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
                  Dipartimento: {deptName} â€” Categoria: {catName}
                </small>
              </div>
              <div className="mb-2"><strong>Canale:</strong> {String(report.channel || report.source || 'OTHER')}</div>
              <div className="mb-2"><strong>Privacy:</strong> {String(report.privacy || '-')}</div>
              <div className="mb-2"><strong>PII sospetti:</strong> {String(report.containsPIISuspected || false)}</div>
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
            {(isAgent && !report.assigneeId) && (
              <Button size="sm" disabled={assignBusy} onClick={async () => { try { setAssignBusy(true); await onAssignMe(); } finally { setAssignBusy(false); } }}>
                {assignBusy ? '...' : 'Prendi in carico'}
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div><strong>Assegnato a:</strong> {report.assigneeName || report.assigneeId || '-'}</div>
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

      <Row className="g-3">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Messaggi</strong>
            </Card.Header>
            <Card.Body>
              <ListGroup>
                {shownMessages.map((m) => (
                  <ListGroup.Item key={m.id}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <Badge bg={(m as any).visibility === 'INTERNAL' ? 'secondary' : 'primary'}>{(m as any).visibility || 'INTERNAL'}</Badge>{' '}
                        <strong>{m.author || '-'}</strong>
                      </div>
                      <small>{new Date(m.createdAt).toLocaleString()}</small>
                    </div>
                    <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                    {(m as any).visibility === 'INTERNAL' && (
                      <div className="mt-2 d-flex" style={{ gap: 8 }}>
                        <Button size="sm" variant="outline-secondary" onClick={async () => {
                          const next = prompt('Modifica nota', String((m as any).note || ''));
                          if (next == null) return;
                          try { await patchMessageNote(id, m.id, next); setToast({ show: true, message: 'Nota aggiornata', variant: 'success' }); const list = await getMessages(id, 'ALL'); setMessages(list as Message[]); }
                          catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Non hai i permessi per questa operazione', variant: 'danger' }); else setToast({ show: true, message: 'Errore salvataggio nota', variant: 'danger' }); }
                        }}>Modifica nota</Button>
                        <Button size="sm" variant="outline-secondary" onClick={async () => {
                          const next = prompt('Modifica testo', String(m.body || ''));
                          if (next == null) return;
                          try { await patchMessageBody(id, m.id, next); setToast({ show: true, message: 'Messaggio aggiornato', variant: 'success' }); const list = await getMessages(id, 'ALL'); setMessages(list as Message[]); }
                          catch (e: any) { const s = e?.response?.status; if (s === 403) setToast({ show: true, message: 'Non hai i permessi per questa operazione', variant: 'danger' }); else setToast({ show: true, message: 'Errore salvataggio messaggio', variant: 'danger' }); }
                        }}>Modifica body</Button>
                      </div>
                    )}
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
                <Form.Control type="file" multiple accept="image/png,image/jpeg,application/pdf,text/plain" disabled={uploading} onChange={(e) => onFilesSelected((e.currentTarget as HTMLInputElement).files)} />
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
                          <small className="text-muted">{a.mimeType} Â· {(a.sizeBytes/1024).toFixed(0)} KB</small>
                        </div>
                        <div>
                          <a className="btn btn-sm btn-outline-secondary" href={buildAttachmentDownloadUrl(id, a.id)} target="_blank" rel="noreferrer">Scarica</a>
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

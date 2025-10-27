// src/pages/ReportDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Badge, ListGroup, Spinner } from "react-bootstrap";
import { fetchDepartments } from "@/lib/departments.api";
import { fetchCategories } from "@/lib/categories.api";
import { getTenantReport } from "@/lib/reports.service";

export default function ReportDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deptName, setDeptName] = useState<string>("-");
  const [catName, setCatName] = useState<string>("-");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTenantReport(id);
        const wr = (data as any)?.whistleReport || data;
        setReport(wr || null);
        const msgs = Array.isArray(wr?.messages) ? wr.messages : [];
        setMessages(msgs);
        // Lookup names
        try {
          const depts = await fetchDepartments();
          const dm = new Map(depts.map(d => [d.id, d.name]));
          const dName = dm.get((wr as any)?.departmentId || "") || "-";
          setDeptName(dName);
          const cats = await fetchCategories((wr as any)?.departmentId || undefined);
          const cm = new Map(cats.map(c => [c.id, c.name]));
          setCatName(cm.get((wr as any)?.categoryId || "") || "-");
        } catch {}
      } catch (e: any) {
        setError(e?.message || "Errore nel caricamento");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const shownMessages = useMemo(() => messages, [messages]);

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
          <Button variant="outline-secondary" onClick={() => navigate("/reports")}>Indietro</Button>
        </div>
      </div>

      <Card className="shadow-sm mb-3">
        <Card.Header>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <strong>{report.id || report.reportId}</strong>{" "}
              <Badge bg={String((report as any).status) === 'CLOSED' ? 'success' : 'warning'}>{String((report as any).status || '-')}</Badge>
            </div>
            <small>creata il {new Date(report.createdAt).toLocaleString()}</small>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="mb-2 text-muted">
            <small>Dipartimento: {deptName} • Categoria: {catName}</small>
          </div>
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Messaggi</h5>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <ListGroup>
            {shownMessages.map((m) => (
              <ListGroup.Item key={m.id}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <Badge bg={m.type === 'INTERNAL' ? 'secondary' : 'primary'}>{m.type}</Badge>{' '}
                    <strong>{m.author || '-'}</strong>
                  </div>
                  <small>{new Date(m.createdAt).toLocaleString()}</small>
                </div>
                <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap" style={{ gap: 8 }}>
                    {m.attachments.map((a: any) => (
                      <Button
                        key={a.id}
                        variant="outline-secondary"
                        size="sm"
                        disabled={!a.url}
                        title={a.url ? a.name : 'download non ancora disponibile'}
                        onClick={() => { if (a.url) window.open(a.url, '_blank'); }}
                      >
                        📎 {a.name}
                      </Button>
                    ))}
                  </div>
                )}
              </ListGroup.Item>
            ))}
            {shownMessages.length === 0 && (
              <div className="text-muted">Nessun messaggio.</div>
            )}
          </ListGroup>
          {/* Messaggi in sola lettura per questo step */}
        </Card.Body>
      </Card>
    </div>
  );
}


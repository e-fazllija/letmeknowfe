// src/pages/ReportDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Badge, ListGroup, Spinner, Alert } from "react-bootstrap";
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
        try {
          const depts = await fetchDepartments();
          const dm = new Map(depts.map((d) => [d.id, d.name]));
          const dName = dm.get((wr as any)?.departmentId || "") || "-";
          setDeptName(dName);
          const cats = await fetchCategories((wr as any)?.departmentId || undefined);
          const cm = new Map(cats.map((c) => [c.id, c.name]));
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
      <div className="page-shell">
        <div className="container-fluid py-2 d-flex align-items-center" style={{ gap: 8 }}>
          <Spinner animation="border" size="sm" />
          <span>Caricamento...</span>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-shell">
        <div className="container-fluid py-2">
          <Alert variant="danger" className="mb-0">{error}</Alert>
        </div>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="page-shell">
        <div className="container-fluid py-2">Segnalazione non trovata.</div>
      </div>
    );
  }

  const status = String((report as any).status || "-");
  const statusVariant = status === "CLOSED" ? "success" : status === "IN_PROGRESS" ? "primary" : "warning";

  return (
    <div className="page-shell">
      <div className="container-fluid py-2">
        <div className="page-hero page-hero--primary mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Segnalazioni</div>
              <h4 className="mb-1">Dettaglio segnalazione</h4>
              <div className="text-secondary small">
                ID {report.id || report.reportId} · Creata il {new Date(report.createdAt).toLocaleString()}
              </div>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <Badge bg={statusVariant}>{status}</Badge>
                <span className="badge-soft">Reparto: {deptName}</span>
                <span className="badge-soft">Categoria: {catName}</span>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline-dark" className="rounded-pill" onClick={() => navigate("/reports")}>
                Indietro
              </Button>
            </div>
          </div>
        </div>

        <Card className="info-card mb-3">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-semibold">Dettagli</div>
              <small className="text-secondary">ID {report.id || report.reportId}</small>
            </div>
            <div className="text-secondary small">
              Dipartimento: <strong className="text-dark">{deptName}</strong> · Categoria:{" "}
              <strong className="text-dark">{catName}</strong>
            </div>
            {report.title && (
              <div className="mt-2">
                <div className="label-muted">Oggetto</div>
                <div className="fw-semibold">{report.title}</div>
              </div>
            )}
            {report.description && (
              <div className="mt-2">
                <div className="label-muted">Descrizione</div>
                <div className="text-secondary" style={{ whiteSpace: "pre-wrap" }}>{report.description}</div>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card className="info-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Messaggi</h6>
            </div>
            <ListGroup>
              {shownMessages.map((m) => (
                <ListGroup.Item key={m.id} className="border-0 border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <Badge bg={m.type === "INTERNAL" ? "secondary" : "primary"}>{m.type}</Badge>{" "}
                      <strong>{m.author || "-"}</strong>
                    </div>
                    <small className="text-secondary">{new Date(m.createdAt).toLocaleString()}</small>
                  </div>
                  <div className="mt-1" style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap" style={{ gap: 8 }}>
                      {m.attachments.map((a: any) => (
                        <Button
                          key={a.id}
                          variant="outline-secondary"
                          size="sm"
                          disabled={!a.url}
                          title={a.url ? a.name : "download non ancora disponibile"}
                          onClick={() => { if (a.url) window.open(a.url, "_blank"); }}
                        >
                          📎 {a.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </ListGroup.Item>
              ))}
              {shownMessages.length === 0 && <div className="text-muted">Nessun messaggio.</div>}
            </ListGroup>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

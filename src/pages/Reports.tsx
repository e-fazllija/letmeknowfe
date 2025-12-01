// src/pages/Reports.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Table, Form, Spinner, Pagination, Card, Row, Col, Alert } from "react-bootstrap";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { useDepartments } from "@/hooks/useDepartments";
import { useCategories } from "@/hooks/useCategories";
import { useDebounced } from "@/hooks/useDebounced";
import { useArchive } from "@/lib/archive.service";
import { STATUS_LABELS, statusToLabel } from "@/lib/status.labels";
import { useAuth, isAuditor } from "@/context/AuthContext";

function statusClass(status: string) {
  if (status === "CLOSED") return "badge bg-success";
  if (status === "IN_PROGRESS") return "badge bg-info text-dark";
  if (status === "OPEN") return "badge bg-warning text-dark";
  return "badge bg-secondary";
}

export default function Reports() {
  const navigate = useNavigate();
  const { has, user } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    q: "",
    status: "",
    departmentId: "",
    categoryId: "",
  });

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    setFilters((prev) => ({
      ...prev,
      q: sp.get("search") || "",
      status: sp.get("status") || "",
      departmentId: sp.get("departmentId") || "",
      categoryId: sp.get("categoryId") || "",
      page: Math.max(1, Number(sp.get("page") || 1)),
      pageSize: [10, 20, 50, 100].includes(Number(sp.get("pageSize") || 20))
        ? Number(sp.get("pageSize") || 20)
        : 20,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set("search", filters.q);
    if (filters.status) p.set("status", filters.status);
    if (filters.departmentId) p.set("departmentId", filters.departmentId);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    p.set("page", String(filters.page));
    p.set("pageSize", String(filters.pageSize));
    const current = new URLSearchParams(location.search);
    if (current.get("view") === "archive") p.set("view", "archive");
    navigate({ pathname: "/reports", search: `?${p.toString()}` }, { replace: true });
  }, [filters, navigate]);

  const { departments } = useDepartments();
  const { categories } = useCategories(filters.departmentId || undefined);
  const qDebounced = useDebounced(filters.q, 300);

  const meId = user?.id ? String(user.id) : undefined;
  const auditorFilters = isAuditor(user)
    ? { auditor: "me", auditorId: meId, internalUserId: meId, assignedToUserId: meId, assignedTo: meId }
    : {};

  const { reports, loading, error } = useReports({
    page: filters.page,
    pageSize: filters.pageSize,
    q: (qDebounced || "").trim() || undefined,
    status: filters.status || undefined,
    departmentId: filters.departmentId || undefined,
    categoryId: filters.categoryId || undefined,
    ...(auditorFilters as any),
  } as any);

  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const categoryIndex = useMemo(
    () => new Map((categories || []).map((c: any) => [String(c.id), String(c.name)])),
    [categories]
  );

  function getCategoryLabel(row: any, idx: Map<string, string>) {
    return (
      row?.category?.name ||
      row?.categoryName ||
      (row?.categoryId ? idx.get(String(row.categoryId)) : undefined) ||
      "-"
    );
  }

  const { ids: archivedIds, add: archive, remove: unarchive, has: isArchived } = useArchive();
  const isArchiveView = params.get("view") === "archive";

  const handleChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: "40vh", gap: 8 }}>
          <Spinner animation="border" />
          <span>Caricamento segnalazioni...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="container-fluid py-3">
          <Alert variant="danger" className="mb-0">{String(error)}</Alert>
        </div>
      </div>
    );
  }

  const rows = reports ?? [];
  const visibleRows = isArchiveView
    ? rows.filter((r) => archivedIds.has(r.id))
    : rows.filter((r) => !archivedIds.has(r.id));

  return (
    <div className="page-shell">
      <div className="container-fluid py-2">
        <div className="page-hero mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Segnalazioni</div>
              <h4 className="mb-1">{isArchiveView ? "Archivio segnalazioni" : "Segnalazioni"}</h4>
              <div className="text-secondary small">
                Filtra per stato, reparto e categoria. Passa rapidamente a nuova segnalazione.
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {has("REPORT_CREATE" as any) && (
                <Button size="sm" variant="dark" className="rounded-pill" onClick={() => navigate("/new")}>
                  Nuova
                </Button>
              )}
              <Button
                size="sm"
                variant={isArchiveView ? "outline-dark" : "dark"}
                className="rounded-pill"
                onClick={() => {
                  params.delete("view");
                  setParams(params, { replace: true });
                }}
              >
                📋 Tutte
              </Button>
              <Button
                size="sm"
                variant={isArchiveView ? "dark" : "outline-dark"}
                className="rounded-pill"
                onClick={() => {
                  params.set("view", "archive");
                  setParams(params, { replace: true });
                }}
              >
                🗄️ Archivio
              </Button>
            </div>
          </div>
        </div>

        <Card className="table-card">
          <Card.Body>
            <Row className="g-3 align-items-end mb-3">
              <Col md={4} lg={3}>
                <Form.Group controlId="search">
                  <Form.Label className="mb-1">🔎 Ricerca</Form.Label>
                  <Form.Control
                    size="sm"
                    placeholder="Cerca per oggetto o testo"
                    value={filters.q}
                    onChange={(e) => handleChange("q", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3} lg={2}>
                <Form.Group controlId="status">
                  <Form.Label className="mb-1">🧭 Stato</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="">Tutti</option>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} lg={3}>
                <Form.Group controlId="departmentId">
                  <Form.Label className="mb-1">🏢 Reparto</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.departmentId}
                    onChange={(e) => handleChange("departmentId", e.target.value)}
                  >
                    <option value="">Tutti</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} lg={3}>
                <Form.Group controlId="categoryId">
                  <Form.Label className="mb-1">📂 Categoria</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.categoryId}
                    onChange={(e) => handleChange("categoryId", e.target.value)}
                    disabled={!filters.departmentId}
                  >
                    <option value="">Tutte</option>
                    {(categories || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Creato il</th>
                    <th>Reparto</th>
                    <th>Categoria</th>
                    <th>Oggetto</th>
                    <th>Stato</th>
                    <th className="text-end">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-secondary py-4">
                        Nessuna segnalazione trovata.
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                      <td>{deptName.get(r.departmentId || "") || "-"}</td>
                      <td className="align-middle">{getCategoryLabel(r, categoryIndex)}</td>
                      <td style={{ fontWeight: 600 }}>{r.title || "-"}</td>
                      <td>
                        <span className={statusClass(r.status)}>{statusToLabel(r.status)}</span>
                      </td>
                      <td className="text-end">
                        <Button size="sm" variant="dark" className="rounded-pill" onClick={() => navigate(`/reports/${encodeURIComponent(r.id)}`)}>
                          Apri
                        </Button>
                        {isArchiveView ? (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            className="ms-2 rounded-pill"
                            onClick={() => {
                              unarchive(r.id);
                            }}
                          >
                            Recupera
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            className="ms-2 rounded-pill"
                            onClick={() => {
                              archive(r.id);
                            }}
                            disabled={isArchived(r.id)}
                            title={isArchived(r.id) ? "Gia in archivio" : "Sposta in archivio"}
                          >
                            Archivia
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            <small>Pagina {filters.page}</small>
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev
              disabled={filters.page === 1}
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            />
            <Pagination.Item active>{filters.page}</Pagination.Item>
            <Pagination.Next
              disabled={(reports?.length || 0) < filters.pageSize}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            />
          </Pagination>
        </div>
      </div>
    </div>
  );
}

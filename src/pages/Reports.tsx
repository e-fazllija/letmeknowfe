// src/pages/Reports.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Table, Form, Spinner, Pagination, InputGroup } from "react-bootstrap";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { useDepartments } from "@/hooks/useDepartments";
import { useCategories } from "@/hooks/useCategories";
import { useDebounced } from "@/hooks/useDebounced";
import { useArchive } from "@/lib/archive.service";
import { STATUS_LABELS, statusToLabel } from "@/lib/status.labels";
import { useAuth } from "@/context/AuthContext";

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

  // Init from URL once
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

  // Sync filters to URL
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

  const { reports, loading, error } = useReports({
    page: filters.page,
    pageSize: filters.pageSize,
    q: (qDebounced || "").trim() || undefined,
    status: filters.status || undefined,
    departmentId: filters.departmentId || undefined,
    categoryId: filters.categoryId || undefined,
    // Auditor visibility:paramentro attuale corretto, per ora non torna nessun report
    internalUserId: user?.role === "auditor" ? "me" : undefined,
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
      <div className="container py-4 d-flex justify-content-center align-items-center" style={{ gap: 8 }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{String(error)}</div>
      </div>
    );
  }

  const rows = reports ?? [];
  const visibleRows = isArchiveView
    ? rows.filter((r) => archivedIds.has(r.id))
    : rows.filter((r) => !archivedIds.has(r.id));

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{isArchiveView ? "Archivio segnalazioni" : "Segnalazioni"}</h2>
        {has("REPORT_CREATE" as any) && (
          <Button variant="dark" onClick={() => navigate("/new")}>
            Nuova
          </Button>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <InputGroup style={{ width: 250 }}>
          <Form.Control
            placeholder="Cerca..."
            value={filters.q}
            onChange={(e) => handleChange("q", e.target.value)}
          />
        </InputGroup>

        <Form.Select
          value={filters.status}
          onChange={(e) => handleChange("status", e.target.value)}
          style={{ width: 180 }}
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Form.Select>

        <Form.Select
          value={filters.departmentId}
          onChange={(e) => handleChange("departmentId", e.target.value)}
          style={{ width: 200 }}
        >
          <option value="">Tutti i reparti</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Form.Select>

        <Form.Select
          value={filters.categoryId}
          onChange={(e) => handleChange("categoryId", e.target.value)}
          disabled={!filters.departmentId}
          style={{ width: 180 }}
        >
          <option value="">Tutte le categorie</option>
          {(categories || []).map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Form.Select>

        <div className="ms-auto d-inline-flex align-items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm ${!isArchiveView ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => {
              params.delete("view");
              setParams(params, { replace: true });
            }}
            title="Mostra tutte"
            aria-pressed={!isArchiveView}
            aria-label="Mostra tutte"
          >
            <span aria-hidden="true">📚</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isArchiveView ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => {
              params.set("view", "archive");
              setParams(params, { replace: true });
            }}
            title="Mostra archivio"
            aria-pressed={isArchiveView}
            aria-label="Mostra archivio"
          >
            <span aria-hidden="true">🗃️</span>
          </button>
        </div>
      </div>

      <Table striped bordered hover responsive className="align-middle text-center">
        <thead className="table-dark">
          <tr>
            <th>Creato il</th>
            <th>Reparto</th>
            <th>Categoria</th>
            <th>Oggetto</th>
            <th>Stato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
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
                <span
                  className={`badge ${
                    r.status === "OPEN"
                      ? "bg-warning text-dark"
                      : r.status === "IN_PROGRESS"
                      ? "bg-info text-dark"
                      : r.status === "CLOSED"
                      ? "bg-success"
                      : "bg-secondary"
                  }`}
                >
                  {statusToLabel(r.status)}
                </span>
              </td>
              <td>
                <Button size="sm" variant="dark" onClick={() => navigate(`/reports/${encodeURIComponent(r.id)}`)}>
                  Apri
                </Button>
                {isArchiveView ? (
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="ms-2"
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
                    className="ms-2"
                    onClick={() => {
                      archive(r.id);
                    }}
                    disabled={isArchived(r.id)}
                    title={isArchived(r.id) ? "Gia' in archivio" : "Sposta in archivio"}
                  >
                    Archivia
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center">
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
  );
}




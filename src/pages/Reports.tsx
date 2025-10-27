// src/pages/Reports.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Table, Form, Spinner, Pagination, InputGroup } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { useDepartments } from "@/hooks/useDepartments";
import { useCategories } from "@/hooks/useCategories";
import { useDebounced } from "@/hooks/useDebounced";

export default function Reports() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    q: "",
    status: "",
    departmentId: "",
    categoryId: "",
  });

  // init from URL once
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters((prev) => ({
      ...prev,
      q: params.get("search") || "",
      status: params.get("status") || "",
      departmentId: params.get("departmentId") || "",
      categoryId: params.get("categoryId") || "",
      page: Math.max(1, Number(params.get("page") || 1)),
      pageSize: [10,20,50,100].includes(Number(params.get("pageSize") || 20)) ? Number(params.get("pageSize") || 20) : 20,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync filters to URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set("search", filters.q);
    if (filters.status) p.set("status", filters.status);
    if (filters.departmentId) p.set("departmentId", filters.departmentId);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    p.set("page", String(filters.page));
    p.set("pageSize", String(filters.pageSize));
    navigate({ pathname: "/reports", search: `?${p.toString()}` }, { replace: true });
  }, [filters, navigate]);

  const { departments } = useDepartments();
  const { categories } = useCategories(filters.departmentId || undefined);
  const qDebounced = useDebounced(filters.q, 300);
  const { reports, loading, error } = useReports({ ...filters, q: qDebounced });

  const deptName = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);
  const catName = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

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
    return <div className="container py-4"><div className="alert alert-danger">{String(error)}</div></div>;
  }

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Segnalazioni</h2>
        <Button variant="dark" onClick={() => navigate('/new')}>Nuova</Button>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <InputGroup style={{ width: 250 }}>
          <Form.Control
            placeholder="Cerca..."
            value={filters.q}
            onChange={(e) => handleChange('q', e.target.value)}
          />
        </InputGroup>

        <Form.Select value={filters.status} onChange={(e) => handleChange('status', e.target.value)} style={{ width: 180 }}>
          <option value="">Tutti gli stati</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="NEED_INFO">NEED_INFO</option>
          <option value="CLOSED">CLOSED</option>
        </Form.Select>

        <Form.Select
          value={filters.departmentId}
          onChange={(e) => {
            const v = e.target.value;
            setFilters((prev) => ({ ...prev, departmentId: v, categoryId: "", page: 1 }));
          }}
          style={{ width: 180 }}
        >
          <option value="">Tutti i reparti</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Form.Select>

        <Form.Select
          value={filters.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          disabled={!filters.departmentId}
          style={{ width: 180 }}
        >
          <option value="">Tutte le categorie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Form.Select>

        <Form.Select value={filters.pageSize} onChange={(e) => handleChange('pageSize', String(Number(e.target.value) || 20))} style={{ width: 100 }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </Form.Select>

        <Button variant="outline-secondary" onClick={() => setFilters({ page: 1, pageSize: 20, q: '', status: '', departmentId: '', categoryId: '' })}>
          Reset
        </Button>
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
          {reports.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">Nessuna segnalazione trovata.</td>
            </tr>
          )}
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
              <td>{deptName.get(r.departmentId || '') || '—'}</td>
              <td>{catName.get(r.categoryId || '') || '—'}</td>
              <td style={{ fontWeight: 600 }}>{r.title || '—'}</td>
              <td>
                <span className={`badge ${
                  r.status === 'OPEN' ? 'bg-warning text-dark' :
                  r.status === 'IN_PROGRESS' ? 'bg-info text-dark' :
                  r.status === 'CLOSED' ? 'bg-success' :
                  'bg-secondary'
                }`}>{r.status}</span>
              </td>
              <td>
                <Button size="sm" variant="dark" onClick={() => navigate(`/reports/${encodeURIComponent(r.id)}`)}>Apri</Button>
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
          <Pagination.Prev disabled={filters.page === 1} onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))} />
          <Pagination.Item active>{filters.page}</Pagination.Item>
          <Pagination.Next disabled={(reports?.length || 0) < filters.pageSize} onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))} />
        </Pagination>
      </div>
    </div>
  );
}

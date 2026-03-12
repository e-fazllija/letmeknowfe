import { useEffect, useMemo, useState } from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { getDashboardData, type DashboardData } from "../../lib/stats.service";
import { parse, format } from "date-fns";
import { it as itLocale } from "date-fns/locale";

const PALETTE = [
  "var(--bs-primary)",
  "var(--accent-vista)",
  "var(--bs-warning)",
  "var(--ink-500)",
  "var(--brand-300)",
  "var(--brand-100)",
];

// util: "2025-01" -> "gen 2025"
function fmtMonth(yyyyMm: string) {
  const d = parse(yyyyMm + "-01", "yyyy-MM-dd", new Date());
  return format(d, "MMM yyyy", { locale: itLocale });
}

export default function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtro range condiviso tra i grafici (12m, 6m, 3m, curr)
  const [range, setRange] = useState<string>("12m");

  useEffect(() => {
    (async () => {
      try {
        const d = await getDashboardData();
        setData(d);
      } catch (e: any) {
        setError(e?.message || "Errore nel caricamento dati");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Serie per andamento (linea)
  const lineData = useMemo(() => {
    if (!data) return [];
    const full = data.byMonth;
    const curr = format(new Date(), "yyyy-MM");
    switch (range) {
      case "6m":
        return full.slice(-6);
      case "3m":
        return full.slice(-3);
      case "curr": {
        const only = full.filter((x) => x.date === curr);
        return only.length ? only : full.slice(-1);
      }
      case "12m":
      default:
        return full;
    }
  }, [data, range]);

  // Serie per stati nel tempo (barre)
  const statusData = useMemo(() => {
    if (!data) return [];
    const full = data.statusOverTime;
    const curr = format(new Date(), "yyyy-MM");
    switch (range) {
      case "6m":
        return full.slice(-6);
      case "3m":
        return full.slice(-3);
      case "curr": {
        const only = full.filter((x) => x.date === curr);
        return only.length ? only : full.slice(-1);
      }
      case "12m":
      default:
        return full;
    }
  }, [data, range]);

  if (loading) return <div className="text-secondary">Caricamento statistiche…</div>;
  if (error) return <Alert variant="warning">{error}</Alert>;
  if (!data) return <Alert variant="secondary">Nessun dato disponibile.</Alert>;

  return (
    <div className="d-flex flex-column gap-4">
      {/* KPI */}
      <Row xs={1} md={4} className="g-3">
        <Col>
          <Card className="h-100">
            <Card.Body>
              <div className="text-secondary small">Numero segnalazioni</div>
              <div className="fs-3 fw-semibold">{data.kpis.reports}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100">
            <Card.Body>
              <div className="text-secondary small">Media giorni per ricezione</div>
              <div className="fs-3 fw-semibold">{data.kpis.avgDaysToReceive}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100">
            <Card.Body>
              <div className="text-secondary small">Media giorni per chiusura</div>
              <div className="fs-3 fw-semibold">{data.kpis.avgDaysToClose}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100">
            <Card.Body>
              <div className="text-secondary small">Nuovi casi</div>
              <div className="fs-3 fw-semibold">{data.kpis.open}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Andamento + filtro range */}
      <Card>
        <Card.Header className="d-flex flex-wrap align-items-center justify-content-between">
          <div className="fw-semibold">Andamento mensile</div>
          <Form.Select size="sm" style={{ maxWidth: 220 }} value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="12m">Ultimi 12 mesi</option>
            <option value="6m">Ultimi 6 mesi</option>
            <option value="3m">Ultimi 3 mesi</option>
            <option value="curr">Mese corrente</option>
          </Form.Select>
        </Card.Header>
        <Card.Body style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
              <XAxis dataKey="date" tickFormatter={fmtMonth} tickMargin={8} minTickGap={24} />
              <YAxis allowDecimals={false} tickMargin={8} />
              <Tooltip labelFormatter={(v) => fmtMonth(String(v))} formatter={(v: any) => [v, "Segnalazioni"]} />
              <Line type="monotone" dataKey="count" stroke={PALETTE[0]} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      <Row xs={1} md={2} className="g-3">
        {/* Reparti */}
        <Col>
          <Card>
            <Card.Header className="fw-semibold">Analisi reparti</Card.Header>
            <Card.Body style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 24, right: 8, bottom: 8, left: 8 }}>
                  <Pie data={data.byDepartment} dataKey="value" nameKey="name" outerRadius={110} label>
                    {data.byDepartment.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Categorie */}
        <Col>
          <Card>
            <Card.Header className="fw-semibold">Analisi categorie</Card.Header>
            <Card.Body style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 24, right: 8, bottom: 8, left: 8 }}>
                  <Pie data={data.byCategory} dataKey="value" nameKey="name" outerRadius={110} label>
                    {data.byCategory.map((_, i) => (
                      <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stati nel tempo + filtro range (sincronizzato) */}
      <Card>
        <Card.Header className="d-flex flex-wrap align-items-center justify-content-between">
          <div className="fw-semibold">Analisi stati</div>
          <Form.Select size="sm" style={{ maxWidth: 220 }} value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="12m">Ultimi 12 mesi</option>
            <option value="6m">Ultimi 6 mesi</option>
            <option value="3m">Ultimi 3 mesi</option>
            <option value="curr">Mese corrente</option>
          </Form.Select>
        </Card.Header>
        <Card.Body style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
              <XAxis dataKey="date" tickFormatter={fmtMonth} tickMargin={8} minTickGap={24} />
              <YAxis allowDecimals={false} tickMargin={8} />
              <Tooltip labelFormatter={(v) => fmtMonth(String(v))} />
              <Legend />
              <Bar dataKey="Nuovo" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Aperto" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chiuso" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    </div>
  );
}


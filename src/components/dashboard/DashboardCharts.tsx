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

// Palette coerente con Bootstrap (primario, success, danger, info, warning…)
const PALETTE = ["#0d6efd", "#198754", "#dc3545", "#0dcaf0", "#ffc107", "#6c757d"];

// util: "2025-01" -> "gen 2025"
function fmtMonth(yyyyMm: string) {
  const d = parse(yyyyMm + "-01", "yyyy-MM-dd", new Date());
  return format(d, "MMM yyyy", { locale: itLocale });
}

export default function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtro mese (default = tutti)
  const [month, setMonth] = useState<string>("__all__");

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

  // opzioni select mesi
  const monthOptions = useMemo(() => {
    if (!data) return [];
    // byMonth è già in ordine crescente nel mock
    return data.byMonth.map((m) => m.date);
  }, [data]);

  // dataset filtrati per i grafici cartesiani
  const lineData = useMemo(() => {
    if (!data) return [];
    if (month === "__all__") return data.byMonth;
    // solo il mese selezionato
    return data.byMonth.filter((x) => x.date === month);
  }, [data, month]);

  const statusData = useMemo(() => {
    if (!data) return [];
    if (month === "__all__") return data.statusOverTime;
    return data.statusOverTime.filter((x) => x.date === month);
  }, [data, month]);

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
              <div className="text-secondary small">Casi aperti</div>
              <div className="fs-3 fw-semibold">{data.kpis.open}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Andamento + filtro mesi */}
      <Card>
        <Card.Header className="bg-white d-flex flex-wrap align-items-center justify-content-between">
          <div className="fw-semibold">Andamento mensile</div>
          <Form.Select
            size="sm"
            style={{ maxWidth: 220 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="__all__">Ultimi 12 mesi</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
          </Form.Select>
        </Card.Header>
        <Card.Body style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtMonth}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tickMargin={8} />
              <Tooltip
                labelFormatter={(v) => fmtMonth(String(v))}
                formatter={(v: any) => [v, "Segnalazioni"]}
              />
              <Line type="monotone" dataKey="count" stroke={PALETTE[0]} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      <Row xs={1} md={2} className="g-3">
        {/* Fonti */}
        <Col>
          <Card>
            <Card.Header className="bg-white fw-semibold">Analisi fonti</Card.Header>
            <Card.Body style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySource}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {data.bySource.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Reparti */}
        <Col>
          <Card>
            <Card.Header className="bg-white fw-semibold">Analisi reparti</Card.Header>
            <Card.Body style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byDepartment}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {data.byDepartment.map((_, i) => (
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

      {/* Stati nel tempo + stesso filtro mesi della linea */}
      <Card>
        <Card.Header className="bg-white d-flex flex-wrap align-items-center justify-content-between">
          <div className="fw-semibold">Analisi stati</div>
          <Form.Select
            size="sm"
            style={{ maxWidth: 220 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="__all__">Ultimi 12 mesi</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
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

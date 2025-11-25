import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import DashboardCharts from "../components/dashboard/DashboardCharts";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <div className="container-fluid py-2">
        <div className="page-hero mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Console</div>
              <h4 className="mb-1">Dashboard</h4>
              <div className="text-secondary small">
                Andamento segnalazioni, reparti e categorie.
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button size="sm" variant="dark" className="rounded-pill" onClick={() => navigate("/new-report")}>
                Nuova segnalazione
              </Button>
              <Button size="sm" variant="outline-dark" className="rounded-pill" onClick={() => navigate("/reports")}>
                Vai ai report
              </Button>
            </div>
          </div>
        </div>

        <DashboardCharts />
      </div>
    </div>
  );
}

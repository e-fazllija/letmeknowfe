import { useEffect, useState } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { getSettingsStats } from '@/lib/settings.service';

export default function SettingsStatsTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const s = await getSettingsStats();
        setStats(s);
      } catch (e: any) {
        setError(e?.message || 'Errore caricamento KPI');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="py-3"><Spinner animation="border" size="sm" /></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const s = stats || {};
  const totalReports = s?.reports?.total ?? '—';
  const totalUsers = s?.users?.total ?? '—';
  const totalDepts = s?.departments?.total ?? '—';
  const totalCats = s?.categories?.total ?? '—';

  return (
    <Row className="g-3">
      <Col md={3}><Card className="shadow-sm"><Card.Body><div className="text-muted">Segnalazioni</div><div className="display-6">{totalReports}</div></Card.Body></Card></Col>
      <Col md={3}><Card className="shadow-sm"><Card.Body><div className="text-muted">Utenti</div><div className="display-6">{totalUsers}</div></Card.Body></Card></Col>
      <Col md={3}><Card className="shadow-sm"><Card.Body><div className="text-muted">Reparti</div><div className="display-6">{totalDepts}</div></Card.Body></Card></Col>
      <Col md={3}><Card className="shadow-sm"><Card.Body><div className="text-muted">Categorie</div><div className="display-6">{totalCats}</div></Card.Body></Card></Col>
    </Row>
  );
}

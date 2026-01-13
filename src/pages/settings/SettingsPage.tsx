import { useEffect, useMemo, useState } from 'react';
import { Nav, Card } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { FEATURE_SETTINGS, FEATURE_TEMPLATES } from '@/config';
import SettingsDepartmentsTab from '@/pages/settings/tabs/SettingsDepartmentsTab';
import SettingsCategoriesTab from '@/pages/settings/tabs/SettingsCategoriesTab';
import SettingsCasePolicyTab from '@/pages/settings/tabs/SettingsCasePolicyTab';
import SettingsTemplatesTab from '@/pages/settings/tabs/SettingsTemplatesTab';
import SettingsBillingTab from '@/pages/settings/tabs/SettingsBillingTab';
import SettingsUsersTab from '@/pages/settings/tabs/SettingsUsersTab';

export default function SettingsPage() {
  const { user } = useAuth();
  const canSettings = FEATURE_SETTINGS && (!!user && (user.role === 'admin' || (user.permissions || []).includes('SETTINGS_ADMIN' as any)));

  const [tab, setTab] = useState<string>('departments');
  const [forceBillingOnly, setForceBillingOnly] = useState(false);

  useEffect(() => {
    try {
      const flag = localStorage.getItem('lmw_after_signup_payment');
      if (flag === '1') {
        setForceBillingOnly(true);
        setTab('billing');
        return;
      }
    } catch {
      // ignore
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t) {
        if (t === 'templates' && !FEATURE_TEMPLATES) setTab('departments');
        else setTab(t);
      }
    } catch {
      // ignore
    }
  }, []);

  // URL sync optional: skipped to avoid hash-router conflicts

  if (!FEATURE_SETTINGS) {
    return (
      <div className="page-shell">
        <div className="container-fluid py-2">
          <Card className="info-card">
            <Card.Body>
              <div className="alert alert-secondary mb-0">Impostazioni disabilitate.</div>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }
  if (!canSettings) {
    return (
      <div className="page-shell">
        <div className="container-fluid py-2">
          <Card className="info-card">
            <Card.Body>
              <div className="alert alert-warning mb-0">Non autorizzato</div>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  const content = useMemo(() => {
    if (forceBillingOnly) return <SettingsBillingTab />;
    switch (tab) {
      case 'users': return <SettingsUsersTab />;
      case 'departments': return <SettingsDepartmentsTab />;
      case 'categories': return <SettingsCategoriesTab />;
      case 'policy': return <SettingsCasePolicyTab />;
      case 'templates': return FEATURE_TEMPLATES ? <SettingsTemplatesTab /> : <SettingsDepartmentsTab/>;
      case 'billing': return <SettingsBillingTab />;
      default: return <SettingsDepartmentsTab />;
    }
  }, [tab, forceBillingOnly]);

  return (
    <div className="page-shell">
      <div className="container-fluid py-2">
        <div className="page-hero page-hero--primary mb-3">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div className="eyebrow">Console</div>
              <h4 className="mb-1">Impostazioni</h4>
              <div className="text-secondary small">Gestisci utenti, reparti, categorie e fatturazione.</div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge-soft">Accesso amministratore</span>
            </div>
          </div>
        </div>

        <Card className="info-card">
          <Card.Body>
            <Nav
              variant="pills"
              activeKey={tab}
              onSelect={(k) => k && setTab(k)}
              className="mb-3 flex-wrap"
              style={{ gap: 8 }}
            >
              {!forceBillingOnly && (
                <>
                  <Nav.Item><Nav.Link eventKey="users">Utenti</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="departments">Reparti</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="categories">Categorie</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="policy">Policy &amp; Info</Nav.Link></Nav.Item>
                  {FEATURE_TEMPLATES && (
                    <Nav.Item><Nav.Link eventKey="templates">Template</Nav.Link></Nav.Item>
                  )}
                </>
              )}
              <Nav.Item><Nav.Link eventKey="billing">Fatturazione</Nav.Link></Nav.Item>
            </Nav>
            <div className="pt-1">
              {content}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

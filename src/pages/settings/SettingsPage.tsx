import { useEffect, useMemo, useState } from 'react';
import { Nav } from 'react-bootstrap';
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

  if (!FEATURE_SETTINGS) return <div className="container py-4"><div className="alert alert-secondary">Impostazioni disabilitate.</div></div>;
  if (!canSettings) return <div className="container py-4"><div className="alert alert-warning">Non autorizzato</div></div>;

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
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Impostazioni</h2>
      </div>
      <Nav variant="pills" activeKey={tab} onSelect={(k) => k && setTab(k)} className="mb-3 flex-wrap" style={{ gap: 8 }}>
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
      {content}
    </div>
  );
}

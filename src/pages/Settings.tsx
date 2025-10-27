import { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

// USER tabs (rimangono solo queste)
import MyAccount from "../components/settings/MyAccount";
import MySecurity from "../components/settings/MySecurity";
import ShareLink from "../components/settings/ShareLink";

// ADMIN tabs (solo quelle mantenute)
import UsersRoles from "../components/settings/admin/UsersRoles";
import Departments from "../components/settings/admin/Departments";
import Categories from "../components/settings/admin/Categories";
import CasePolicy from "../components/settings/admin/CasePolicy";
import Templates from "../components/settings/admin/Templates";
import Billing from "../components/settings/admin/Billing";

export default function Settings() {
  const { has } = useAuth();
  // Se usi un altro permesso per riconoscere l'admin, sostituisci qui:
  const isAdmin = has("REPORT_CREATE");

  const [activeKey, setActiveKey] = useState<string>("account");

  useEffect(() => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab");
    if (tab) setActiveKey(tab);
  }, []);

  // Tab comuni (user)
  const commonTabs = [
    { key: "account", title: "Il mio account", node: <MyAccount /> },
    { key: "security", title: "Sicurezza", node: <MySecurity /> },
    { key: "share", title: "Condividi link di segnalazione", node: <ShareLink /> },
  ];

  // Tab admin
  const adminTabs = isAdmin
    ? [
        { key: "users", title: "Utenti & Ruoli", node: <UsersRoles /> },
        { key: "teams", title: "Reparti", node: <Departments /> },
        { key: "categories", title: "Categorie", node: <Categories /> },
        { key: "case", title: "Gestione del caso", node: <CasePolicy /> },
        { key: "templates", title: "Modelli", node: <Templates /> },
        { key: "billing", title: "Fatturazione", node: <Billing /> },
      ]
    : [];

  const tabs = [...commonTabs, ...adminTabs];

  return (
    <div className="container py-3">
      <h1 className="h4 mb-3">Impostazioni</h1>
      <Tabs
        id="settings-tabs"
        activeKey={activeKey}
        onSelect={(k) => k && setActiveKey(k)}
        className="mb-3"
      >
        {tabs.map((t) => (
          <Tab eventKey={t.key} title={t.title} key={t.key}>
            <div className="pt-3">{t.node}</div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}

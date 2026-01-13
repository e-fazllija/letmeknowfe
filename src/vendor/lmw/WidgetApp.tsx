import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ReportForm from "./components/ReportForm";
import PublicConfirm from "./pages/PublicConfirm";
import CaseAccessPublic from "./pages/CaseAccessPublic";
import AnacInfo from "./pages/AnacInfo";
import logo from "../../assets/Logo_Letmeknow_Scritta_Sotto_Scuro.png";

// CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

function Shell() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12 col-md-3 col-lg-2 p-0 sidebar-col">
          <Sidebar logoSrc={logo} title="LetMeKnow" />
        </div>
        <main className="col-12 col-md-9 col-lg-10 p-4 widget-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function LmwRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/new/text" replace />} />
        <Route path="/new/text" element={<ReportForm />} />
        <Route path="/new/voice" element={<Navigate to="/new/text" state={{ openVoice: true }} replace />} />
        <Route path="/voice" element={<Navigate to="/new/text" state={{ openVoice: true }} replace />} />
        <Route path="/case/access" element={<CaseAccessPublic />} />
        <Route path="/confirm" element={<PublicConfirm />} />
        <Route path="/anac" element={<AnacInfo />} />
        <Route path="*" element={<Navigate to="/new/text" replace />} />
      </Route>
    </Routes>
  );
}

export default function LmwWidgetApp() {
  return (
    <HashRouter>
      <LmwRoutes />
    </HashRouter>
  );
}

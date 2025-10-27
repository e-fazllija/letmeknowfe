// src/App.tsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/lib/api.refresh.queue";
import "@/lib/api.auth.header";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { PublicLayout } from "./layouts/PublicLayout";
import { PrivateLayout } from "./layouts/PrivateLayout";

import type { ReactNode } from "react";
import type { Permission } from "./context/AuthContext";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Home from "./pages/Home";
import NewReport from "./pages/NewReport";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Settings from "./pages/Settings";

// NUOVE PAGINE (attivazione + MFA)
import Activate from "./pages/Activate";
import MfaSetup from "./pages/MfaSetup";
import MfaVerify from "./pages/MfaVerify";
import MfaCode from "./pages/MfaCode";
import MfaComplete from "./pages/MfaComplete";
import RegisterClient from "./pages/RegisterClient";
import TenantSignup from "./pages/TenantSignup";

/** Guard permessi a livello rotta (403 se assente) */
function RequirePermission({
  perm,
  children,
}: {
  perm: Permission;
  children: ReactNode;
}) {
  const { has } = useAuth();
  return has(perm) ? (
    <>{children}</>
  ) : (
    <div className="alert alert-warning">403 — Non autorizzato</div>
  );
}


/** /logout: pulisce lo storage e reindirizza a /login */
function LogoutNow() {
  try {
    localStorage.removeItem("letmeknow_auth");
    localStorage.removeItem("lmw_token");
    localStorage.removeItem("lmw_user_email");
    localStorage.removeItem("lmw_user_role");
  } catch {}
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* --- Area PUBBLICA --- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
                        <Route path="/logout" element={<LogoutNow />} />
            <Route path="/register" element={<RegisterClient />} />
            <Route path="/tenant-signup" element={<TenantSignup />} />

            {/* Attivazione + MFA */}
            <Route path="/activate" element={<Activate />} />
            <Route path="/mfa/code" element={<MfaCode />} />
            <Route path="/mfa/setup" element={<MfaSetup />} />
            <Route path="/mfa/verify" element={<MfaVerify />} />
            <Route path="/mfa/complete" element={<MfaComplete />} />
          </Route>

          {/* --- Area PRIVATA --- */}
          <Route element={<ProtectedRoute><PrivateLayout /></ProtectedRoute>}>
            <Route path="/home" element={<Home />} />
            <Route path="/new-report" element={<RequirePermission perm="REPORT_CREATE"><NewReport /></RequirePermission>} />
            <Route path="/new" element={<RequirePermission perm="REPORT_CREATE"><NewReport /></RequirePermission>} />
            <Route path="/reports" element={<RequirePermission perm="REPORTS_VIEW"><Reports /></RequirePermission>} />
            <Route path="/reports/:id" element={<RequirePermission perm="REPORTS_VIEW"><ReportDetail /></RequirePermission>} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* fallback: redirect a login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}





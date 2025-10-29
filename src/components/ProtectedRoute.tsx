// src/components/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();

  // Attendi bootstrap auth prima di decidere
  if (!ready) {
    return null; // placeholder durante il bootstrap
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ redirectTo: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}


import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth, isAuditor } from '@/context/AuthContext';

/** Blocks auditor from visiting mutating routes and redirects to read-only detail or list. */
export default function AuditorGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { id } = ((): { id?: string } => {
    const m = location.pathname.match(/\/reports\/([^/]+)/);
    return { id: m?.[1] };
  })();

  if (isAuditor(user)) {
    const p = location.pathname.toLowerCase();
    const banned = [
      '/new',
      '/new-report',
      '/edit',
      '/compose-message',
      '/attach',
      '/export',
      '/download',
    ];
    if (banned.some((b) => p.includes(b))) {
      return <Navigate to={id ? `/reports/${encodeURIComponent(id)}` : '/reports'} replace />;
    }
  }
  return <>{children}</>;
}


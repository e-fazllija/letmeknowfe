import { useEffect, useState } from "react";
import api from "@/lib/api";

type UserMini = { id: string; email?: string; displayName?: string };

const TENANT_ID =
  (import.meta as any).env?.VITE_TENANT_ID ||
  (import.meta as any).env?.VITE_DEFAULT_TENANT_ID ||
  (import.meta as any).env?.VITE_PUBLIC_TENANT_ID;

function mapUser(u: any): UserMini {
  return {
    id: u?.id,
    email: u?.email ?? u?.emailAddress ?? undefined,
    displayName: u?.displayName ?? u?.name ?? undefined,
  };
}

export function useUserResolver(ids: string[]) {
  const [resolved, setResolved] = useState<Record<string, UserMini>>({});

  useEffect(() => {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    if (!unique.length) return;

    let cancelled = false;

    async function run() {
      const cfg = TENANT_ID ? { headers: { "x-tenant-id": TENANT_ID } } : {};

      // Try 1: /internal-users?ids=...
      try {
        const res = await api.get("/v1/tenant/internal-users", {
          params: { ids: unique.join(",") },
          ...cfg,
        });
        if (!cancelled && Array.isArray(res.data)) {
          const map: Record<string, UserMini> = {};
          for (const u of res.data) if (u?.id) map[u.id] = mapUser(u);
          setResolved(map);
          return;
        }
      } catch {}

      // Try 2: /users?ids=...
      try {
        const res = await api.get("/v1/tenant/users", {
          params: { ids: unique.join(",") },
          ...cfg,
        });
        if (!cancelled && Array.isArray(res.data)) {
          const map: Record<string, UserMini> = {};
          for (const u of res.data) if (u?.id) map[u.id] = mapUser(u);
          setResolved(map);
          return;
        }
      } catch {}

      // Try 3: /users (full) + filtro client (solo dev)
      try {
        const res = await api.get("/v1/tenant/users", cfg);
        if (!cancelled && Array.isArray(res.data)) {
          const wanted = new Set(unique);
          const map: Record<string, UserMini> = {};
          for (const u of res.data) if (u?.id && wanted.has(u.id)) map[u.id] = mapUser(u);
          setResolved(map);
        }
      } catch {
        // fallback silenzioso
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.from(new Set((ids || []).filter(Boolean))).join(",")]);

  return resolved;
}

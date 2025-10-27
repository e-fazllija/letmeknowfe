import { useEffect, useState } from "react";
import api, { v1 } from "@/lib/api";

export interface Report {
  id: string;
  createdAt: string;
  title: string;
  status: string;
  departmentId?: string | null;
  categoryId?: string | null;
}

export function useReports(filters: {
  page: number;
  pageSize: number;
  status?: string;
  departmentId?: string;
  categoryId?: string;
  q?: string;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(v1("tenant/reports"), {
          params: { ...filters },
          withCredentials: true,
        });
        if (!alive) return;
        setReports(Array.isArray(res.data) ? (res.data as Report[]) : []);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Errore caricamento segnalazioni");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // stringify filters to trigger when deep-equal changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { reports, loading, error };
}


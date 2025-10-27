import { useEffect, useState } from "react";
import { USE_PUBLIC_LOOKUPS } from "@/config";
import { fetchDepartmentsPublic, fetchDepartmentsTenant, type Dept } from "@/lib/lookups.service";

export function useDepartments() {
  const [data, setData] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const deps = USE_PUBLIC_LOOKUPS ? await fetchDepartmentsPublic() : await fetchDepartmentsTenant();
        if (!alive) return;
        setData(deps);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || "Errore caricamento reparti");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { departments: data, loading, error };
}

import { useEffect, useMemo, useState } from "react";
import { fetchDepartments, fetchCategories, type Dept, type Cat } from "@/lib/lookups.service";

export function useLookups() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [categories, setCategories]   = useState<Cat[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [deps, cats] = await Promise.all([
          fetchDepartments(),
          fetchCategories(),
        ]);
        if (!alive) return;
        setDepartments(deps);
        setCategories(cats);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || "Errore caricamento lookups");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const categoriesByDept = useMemo(() => {
    const map = new Map<string, Cat[]>();
    for (const c of categories) {
      const key = (c.departmentId || "_none") as string;
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [categories]);

  return { departments, categories, categoriesByDept, loading, error };
}


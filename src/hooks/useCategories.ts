import { useEffect, useState } from "react";
import { USE_PUBLIC_LOOKUPS } from "@/config";
import { fetchCategoriesPublic, fetchCategoriesTenant, type Cat } from "@/lib/lookups.service";

export function useCategories(departmentId?: string) {
  const [data, setData] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = USE_PUBLIC_LOOKUPS
          ? (departmentId ? await fetchCategoriesPublic(departmentId) : [])
          : await fetchCategoriesTenant(departmentId);
        if (!alive) return;
        setData(cats);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || "Errore caricamento categorie");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [departmentId]);

  return { categories: data, loading, error };
}

import api, { v1, getSavedTenantId } from "@/lib/api";

export type Dept = { id: string; name: string; sortOrder?: number };
export type Cat  = { id: string; name: string; departmentId?: string | null; sortOrder?: number };

const adaptDepartment = (raw: any): Dept => ({
  id: raw?.id ?? raw?.departmentId ?? raw?.cuid ?? "",
  name: raw?.name ?? raw?.title ?? raw?.label ?? "",
  sortOrder: raw?.sortOrder ?? undefined,
});

const adaptCategory = (raw: any): Cat => ({
  id: raw?.id ?? raw?.categoryId ?? raw?.cuid ?? "",
  name: raw?.name ?? raw?.title ?? raw?.label ?? "",
  departmentId: raw?.departmentId ?? raw?.deptId ?? null,
  sortOrder: raw?.sortOrder ?? undefined,
});

// ---------- Public lookups (NO auth, header x-tenant-id obbligatorio) ----------
export async function fetchDepartmentsPublic(): Promise<Dept[]> {
  const tenantId = (() => {
    const saved = getSavedTenantId();
    if (saved && String(saved).trim()) return String(saved).trim();
    // Dev fallback: consenti uso di VITE_DEV_TENANT_ID o (legacy) VITE_TENANT_ID
    if (import.meta.env.DEV) {
      const dev = (import.meta as any).env?.VITE_DEV_TENANT_ID as string | undefined;
      const legacy = (import.meta as any).env?.VITE_TENANT_ID as string | undefined;
      const val = String(dev || legacy || "").trim();
      if (val) return val;
    }
    return undefined;
  })();
  const resp = await fetch(v1("public/departments"), {
    method: "GET",
    credentials: "include",
    headers: tenantId ? { "x-tenant-id": tenantId } as Record<string,string> : {},
  });
  if (!resp.ok) throw new Error(`departments public failed: ${resp.status}`);
  const data = await resp.json();
  try { console.debug("[lookups] deps res.data =", data); } catch {}
  const arr = Array.isArray(data) ? data : data?.items ?? [];
  return arr.map(adaptDepartment).filter((d: Dept) => d.id && d.name);
}

export async function fetchCategoriesPublic(departmentId?: string): Promise<Cat[]> {
  const tenantId = (() => {
    const saved = getSavedTenantId();
    if (saved && String(saved).trim()) return String(saved).trim();
    if (import.meta.env.DEV) {
      const dev = (import.meta as any).env?.VITE_DEV_TENANT_ID as string | undefined;
      const legacy = (import.meta as any).env?.VITE_TENANT_ID as string | undefined;
      const val = String(dev || legacy || "").trim();
      if (val) return val;
    }
    return undefined;
  })();
  const url = new URL(v1("public/categories"), window.location.origin);
  if (departmentId) url.searchParams.set("departmentId", departmentId);
  const resp = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: tenantId ? { "x-tenant-id": tenantId } as Record<string,string> : {},
  });
  if (!resp.ok) throw new Error(`categories public failed: ${resp.status}`);
  const data = await resp.json();
  try { console.debug("[lookups] cats res.data =", data, "dept =", departmentId); } catch {}
  const arr = Array.isArray(data) ? data : data?.items ?? [];
  return arr.map(adaptCategory).filter((c: Cat) => c.id && c.name);
}

// ---------- Tenant lookups (cookie-first) ----------
export async function fetchDepartmentsTenant(): Promise<Dept[]> {
  const res = await api.get(v1("tenant/departments"), { withCredentials: true });
  try { console.debug("[lookups] deps res.data =", res.data); } catch {}
  const arr = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
  return arr.map(adaptDepartment).filter((d: Dept) => d.id && d.name);
}

export async function fetchCategoriesTenant(departmentId?: string): Promise<Cat[]> {
  const res = await api.get(v1("tenant/categories"), {
    withCredentials: true,
    params: departmentId ? { departmentId } : undefined,
  });
  try { console.debug("[lookups] cats res.data =", res.data, "dept =", departmentId); } catch {}
  const arr = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
  return arr.map(adaptCategory).filter((c: Cat) => c.id && c.name);
}

// --- Compat: alias coerenti e default export ---
export const fetchDepartments = fetchDepartmentsPublic;
export const fetchCategories = fetchCategoriesPublic;
const lookups = {
  getPublicDepartments: fetchDepartmentsPublic,
  getPublicCategories: fetchCategoriesPublic,
  fetchDepartments,
  fetchCategories,
};
export default lookups;

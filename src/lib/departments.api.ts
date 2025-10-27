// src/lib/departments.api.ts
import api, { v1 } from "@/lib/api";

export async function fetchDepartments(): Promise<Array<{ id: string; name: string }>> {
  const res = await api.get(v1("public/departments"));

  const raw = Array.isArray(res.data)
    ? res.data
    : Array.isArray((res.data as any)?.items)
    ? (res.data as any).items
    : [];

  return (raw as any[]).map((i) => ({ id: String((i as any).id), name: String((i as any).name) }));
}

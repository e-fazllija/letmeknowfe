// src/lib/categories.api.ts
import api, { v1 } from "@/lib/api";

export async function fetchCategories(departmentId: string): Promise<Array<{ id: string; name: string }>> {
  if (!departmentId) throw new Error("departmentId mancante");

  const res = await api.get(v1("public/categories"), {
    params: { departmentId },
  });

  const items = (res.data ?? []) as Array<{ id: string; name: string; sortOrder?: number }>;
  return items.map(i => ({ id: i.id, name: i.name }));
}

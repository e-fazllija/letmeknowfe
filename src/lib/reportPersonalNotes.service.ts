// src/lib/reportPersonalNotes.service.ts
import api, { v1 } from "@/lib/api";

export type MyNote = { body: string | null; updatedAt?: string };

export async function getMyNote(reportId: string): Promise<MyNote> {
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}/my-note`), { withCredentials: true });
  const body = (data?.body ?? null) as string | null;
  const updatedAt = (data?.updatedAt ?? undefined) as string | undefined;
  return { body, updatedAt };
}

export async function putMyNote(reportId: string, body: string): Promise<MyNote> {
  const { data } = await api.put(
    v1(`tenant/reports/${encodeURIComponent(reportId)}/my-note`),
    { body },
    { withCredentials: true }
  );
  const outBody = (data?.body ?? null) as string | null;
  const updatedAt = (data?.updatedAt ?? undefined) as string | undefined;
  return { body: outBody, updatedAt };
}

export async function deleteMyNote(reportId: string): Promise<{ message?: string }> {
  const { data } = await api.delete(v1(`tenant/reports/${encodeURIComponent(reportId)}/my-note`), { withCredentials: true });
  return (data as any) || { message: "DELETED" };
}


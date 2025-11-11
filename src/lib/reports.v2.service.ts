// src/lib/reports.v2.service.ts
// Client servizi per Dettaglio Report V2 allineato al BE reale

import api, { v1, ORIGIN } from "@/lib/api";

export type ReportStatus = "OPEN" | "IN_PROGRESS" | "SUSPENDED" | "NEED_INFO" | "CLOSED";

export type MessageVisibility = "PUBLIC" | "INTERNAL";

export type Message = {
  id: string;
  reportId: string;
  visibility?: MessageVisibility;
  author?: string;
  body: string;
  note?: string;
  createdAt: string;
  [k: string]: any;
};

export type ReportDetail = any; // Il BE restituisce WhistleReport + messages[] asc

export async function getReportById(reportId: string): Promise<ReportDetail> {
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}`), { withCredentials: true });
  return data as ReportDetail;
}

// Allegati (tenant): lista e URL download (302 presigned GET lato BE)
export type AttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status?: string;
  createdAt: string;
};

export async function getAttachments(reportId: string): Promise<AttachmentItem[]> {
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}/attachments`), { withCredentials: true });
  return (Array.isArray(data) ? data : []) as AttachmentItem[];
}

export function buildAttachmentDownloadUrl(reportId: string, attachmentId: string): string {
  return `${ORIGIN}${v1(`tenant/reports/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}`)}`;
}

// --- Users (ADMIN assign select) ---
export type TenantUser = { id: string; email?: string; name?: string; role?: string };

const MOCK_USERS: TenantUser[] = [
  { id: "usr_mock_1", email: "mock.agent@tenant.local" },
  { id: "usr_mock_2", email: "mock.second@tenant.local" },
];

export async function fetchAgentUsers(): Promise<TenantUser[]> {
  try {
    const { data } = await api.get(v1("tenant/users"), { params: { role: "AGENT" }, withCredentials: true });
    const list = Array.isArray(data) ? (data as TenantUser[]) : [];
    return list.map((u) => ({ id: String(u.id), email: u.email, name: u.name, role: u.role }));
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 404 || status === 501) return MOCK_USERS; // backend non ancora pronto → mock
    // fallback prudente in dev
    if (import.meta.env.DEV) return MOCK_USERS;
    return [];
  }
}

// Cached variant (sessionStorage) with TTL 10 minutes
const USERS_CACHE_KEY = "lmw_users_agents";
const USERS_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchAgentUsersCached(): Promise<TenantUser[]> {
  try {
    const raw = sessionStorage.getItem(USERS_CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { ts: number; list: TenantUser[] };
        if (parsed && typeof parsed.ts === "number" && Array.isArray(parsed.list)) {
          const fresh = Date.now() - parsed.ts < USERS_TTL_MS;
          if (fresh) return parsed.list;
        }
      } catch { /* ignore parse errors */ }
    }
  } catch { /* ignore storage errors */ }

  const list = await fetchAgentUsers();
  try { sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), list })); } catch { /* ignore */ }
  return list;
}

export async function patchStatus(input: { reportId: string; status: ReportStatus; note?: string; author?: string; agentId?: string; clientId?: string }): Promise<void> {
  const { reportId, ...body } = input;
  await api.patch(v1(`tenant/reports/${encodeURIComponent(reportId)}/status`), { reportId, ...body }, { withCredentials: true });
}

export async function assignMe(reportId: string): Promise<void> {
  await api.post(v1(`tenant/reports/${encodeURIComponent(reportId)}/assign/me`), undefined, { withCredentials: true });
}

export async function assign(reportId: string, userId: string): Promise<void> {
  await api.post(v1(`tenant/reports/${encodeURIComponent(reportId)}/assign`), { userId }, { withCredentials: true });
}

export async function unassign(reportId: string): Promise<void> {
  await api.post(v1(`tenant/reports/${encodeURIComponent(reportId)}/unassign`), undefined, { withCredentials: true });
}

export async function takeReport(reportId: string): Promise<{ message: string; report: any }> {
  const { data } = await api.post(
    v1(`tenant/reports/${encodeURIComponent(reportId)}/take`),
    undefined,
    { withCredentials: true }
  );
  return (data as any) || { message: "", report: null };
}

export async function postMessage(input: { reportId: string; body: string; visibility?: MessageVisibility }): Promise<Message> {
  const { data } = await api.post(v1("tenant/reports/message"), input, { withCredentials: true });
  return data as Message;
}

export async function getMessages(reportId: string, visibilityCsv = "ALL"): Promise<Message[]> {
  const vis = visibilityCsv || 'ALL';
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}/messages`), { params: { visibility: vis }, withCredentials: true });
  return Array.isArray(data) ? (data as Message[]) : [];
}

export async function patchMessageNote(reportId: string, messageId: string, note: string): Promise<void> {
  await api.patch(v1(`tenant/reports/${encodeURIComponent(reportId)}/message/${encodeURIComponent(messageId)}/note`), { note }, { withCredentials: true });
}

export async function patchMessageBody(reportId: string, messageId: string, body: string): Promise<void> {
  await api.patch(v1(`tenant/reports/${encodeURIComponent(reportId)}/message/${encodeURIComponent(messageId)}/body`), { body }, { withCredentials: true });
}

export async function assignAuditor(reportId: string, auditorId: string): Promise<{ message?: string }> {
  const { data } = await api.post(
    v1(`tenant/reports/${encodeURIComponent(reportId)}/auditors`),
    { auditorId },
    { withCredentials: true }
  );
  return (data as any) || { message: 'AUDITOR_ASSIGNED' };
}

export async function unassignAuditor(reportId: string, auditorId: string): Promise<{ message?: string }> {
  const { data } = await api.delete(
    v1(`tenant/reports/${encodeURIComponent(reportId)}/auditors`),
    { data: { auditorId }, withCredentials: true } as any
  );
  return (data as any) || { message: 'AUDITOR_UNASSIGNED' };
}
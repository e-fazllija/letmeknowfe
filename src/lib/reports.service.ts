// src/lib/reports.service.ts
import api, { v1, getSavedTenantId } from "@/lib/api";

export type TenantReportCreate = {
  date: string; // ISO
  source: "WEB" | "PHONE" | "EMAIL" | "OTHER" | "ALTRO";
  privacy?: "ANONIMO" | "CONFIDENZIALE";
  subject: string; // 3..200
  departmentId: string;
  categoryId: string;
  description: string; // 10..10000
  // attachments?: { fileName:string; mimeType:string; sizeBytes:number; storageKey:string; proof?:string; }[];
};

export async function createTenantReport(payload: TenantReportCreate) {
  const { data } = await api.post(v1("tenant/reports"), payload, { withCredentials: true });
  return data as { reportId: string; publicCode: string; secret: string; createdAt: string };
}

export type TenantReportListParams = {
  page?: number;
  pageSize?: number;
  status?: Array<"OPEN" | "IN_PROGRESS" | "SUSPENDED" | "NEED_INFO" | "CLOSED">;
  departmentId?: string;
  categoryId?: string;
  q?: string;
};

export async function listTenantReports(params: TenantReportListParams = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.status?.length) search.set("status", params.status.join(","));
  if (params.departmentId) search.set("departmentId", params.departmentId);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.q) search.set("q", params.q);
  const { data } = await api.get(v1(`tenant/reports${search.size ? `?${search.toString()}` : ""}`), { withCredentials: true });
  return data as any[]; // array di report
}

export async function getTenantReport(reportId: string) {
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}`), { withCredentials: true });
  return data;
}

/* --------- Estensioni per create report JSON + presign allegati --------- */

// Util per CSRF opzionale (se attivo a BE)
function getCookie(name: string): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export type AttachmentMeta = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  proof?: string;
};

export type CreateReportInput = {
  date: string; // ISO
  source: "WEB" | "PHONE" | "EMAIL" | "OTHER" | "ALTRO";
  subject: string;
  departmentId: string;
  categoryId: string;
  description: string;
  privacy?: "ANONIMO" | "CONFIDENZIALE";
  attachments?: AttachmentMeta[];
};

export async function createReport(input: CreateReportInput) {
  const sourceNorm = (input.source || "WEB").toUpperCase();
  const source = sourceNorm === "ALTRO" ? "OTHER" : (sourceNorm as CreateReportInput["source"]);

  const payload = {
    date: input.date,
    source,
    subject: input.subject,
    departmentId: input.departmentId,
    categoryId: input.categoryId,
    description: input.description,
    privacy: input.privacy ?? "ANONIMO",
    attachments: input.attachments ?? [],
  };

  const csrf = getCookie("XSRF-TOKEN");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (csrf) headers["X-CSRF-Token"] = csrf;

  const res = await api.post(v1("tenant/reports"), payload, { withCredentials: true, headers });
  return res.data as { reportId: string; publicCode: string; secret: string; createdAt: string };
}

export type PresignReq = { fileName: string; mimeType: string; sizeBytes: number };
export type PresignRes = { uploadUrl: string; storageKey: string; headers?: Record<string,string>; proof?: string };

export async function presignAttachment(req: PresignReq): Promise<PresignRes> {
  const tenantId = getSavedTenantId();
  const url = v1("public/reports/attachments/presign");
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    body: JSON.stringify(req),
  });
  if (!resp.ok) throw new Error(`presign failed: ${resp.status}`);
  return (await resp.json()) as PresignRes;
}

export async function finalizeAttachment(storageKey: string, proof?: string) {
  const tenantId = getSavedTenantId();
  const url = v1("public/reports/attachments/finalize");
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    body: JSON.stringify({ storageKey, proof }),
  });
  if (!resp.ok) throw new Error(`finalize failed: ${resp.status}`);
  return await resp.json();
}

export async function uploadToPresigned(url: string, file: File, extraHeaders?: Record<string,string>) {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", file.type || "application/octet-stream");
  const resp = await fetch(url, { method: "PUT", body: file, headers });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
}

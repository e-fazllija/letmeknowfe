// src/lib/reports.service.ts
import api, { v1 } from "@/lib/api";

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
  // opzionale: solo per privacy "CONFIDENZIALE"
  reporterName?: string;
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
    // Invia il nominativo solo se privacy CONFIDENZIALE e valorizzato
    ...(input.privacy === "CONFIDENZIALE" && input.reporterName ? { reporterName: input.reporterName } : {}),
    attachments: input.attachments ?? [],
  };

  const csrf = getCookie("XSRF-TOKEN");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (csrf) headers["X-CSRF-Token"] = csrf;

  const res = await api.post(v1("tenant/reports"), payload, { withCredentials: true, headers });
  return res.data as { reportId: string; publicCode: string; secret: string; createdAt: string };
}

export type PresignReq = { fileName: string; mimeType: string; sizeBytes: number };
export type PresignRes = {
  uploadUrl: string;
  storageKey: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  proof?: string;
};

export async function presignAttachment(req: PresignReq): Promise<PresignRes> {
  // Backoffice flow: tenant endpoints (JWT); body expects { files: [...] }, response { items: [...] }
  const url = v1("tenant/reports/attachments/presign");
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: [{ fileName: req.fileName, mimeType: req.mimeType, sizeBytes: req.sizeBytes }] }),
  });
  if (!resp.ok) throw new Error(`presign failed: ${resp.status}`);
  const raw: any = await resp.json();
  // Preferisci schema nuovo: items[0]
  const first = Array.isArray(raw?.items) ? raw.items[0] : undefined;
  if (first) {
    const uploadUrl = first?.uploadUrl;
    const storageKey = first?.storageKey;
    const headers = first?.headers || undefined;
    const proof = first?.proof || undefined;
    if (!uploadUrl || !storageKey) throw new Error("Invalid presign response: missing uploadUrl or storageKey");
    return { uploadUrl, storageKey, headers, proof };
  }
  // Fallback compat (vecchio schema public)
  const uploadUrl =
    raw?.uploadUrl || raw?.url || raw?.putUrl || raw?.putURL || raw?.uploadURL || raw?.upload_url || raw?.href || raw?.presignedUrl || raw?.presigned_url;
  const storageKey = raw?.storageKey || raw?.key || raw?.storage_key || raw?.objectKey || raw?.object_key;
  const headers = raw?.headers || raw?.signedHeaders || raw?.signed_headers || undefined;
  const fields = raw?.fields || raw?.form || raw?.formFields || raw?.form_fields || undefined;
  const proof = raw?.proof || raw?.signature || undefined;
  if (!uploadUrl || !storageKey) throw new Error("Invalid presign response: missing uploadUrl or storageKey");
  return { uploadUrl, storageKey, headers, fields, proof } as PresignRes;
}

export async function finalizeAttachment(input: { storageKey: string; sizeBytes: number; fileName: string; mimeType: string; etag?: string | null; proof?: string }) {
  const url = v1("tenant/reports/attachments/finalize");
  const item = { storageKey: input.storageKey, sizeBytes: input.sizeBytes, fileName: input.fileName, mimeType: input.mimeType, ...(input.etag ? { etag: input.etag } : {}), ...(input.proof ? { hmac: input.proof } : {}) } as Record<string, any>;
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [item] }),
  });
  if (!resp.ok) throw new Error(`finalize failed: ${resp.status}`);
  // Risposta può essere 200 con JSON {accepted, rejected} o 204
  try { await resp.text(); } catch {}
}

export async function uploadToPresigned(url: string, file: File, extra?: Record<string, string>): Promise<string | null> {
  // Se extra contiene campi tipici S3 form (policy, x-amz-...), usa POST multipart
  const isFormLike = !!extra && Object.keys(extra).some((k) => /^(policy|x-amz-|acl|key|bucket)$/i.test(k));
  if (isFormLike) {
    const form = new FormData();
    for (const [k, v] of Object.entries(extra!)) form.append(k, v);
    form.append("file", file);
    const resp = await fetch(url, { method: "POST", body: form });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    try { return resp.headers.get('ETag') || resp.headers.get('etag'); } catch { return null; }
  }
  // Altrimenti PUT binario con eventuali header firmati
  const headers = new Headers(extra || {});
  headers.set("Content-Type", file.type || "application/octet-stream");
  const resp = await fetch(url, { method: "PUT", body: file, headers });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  try { return resp.headers.get('ETag') || resp.headers.get('etag'); } catch { return null; }
}

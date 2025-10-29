// src/lib/attachments.service.ts
// Servizio PUBLIC per presign/finalize allegati del report detail V2
// Nota: l'header x-tenant-id è gestito dall'interceptor api.headers.v2.ts

import api, { v1 } from "@/lib/api";

export type PresignReq = { filename: string; mimeType: string; size: number };
export type PresignRes = { uploadUrl: string; storageKey: string; fields?: Record<string,string> };

export async function presignAttachment(req: PresignReq): Promise<PresignRes> {
  const { data } = await api.post(v1("public/reports/attachments/presign"), req, { withCredentials: true });
  return data as PresignRes;
}

export async function finalizeAttachment(req: { storageKey: string; reportId: string }): Promise<void> {
  await api.post(v1("public/reports/attachments/finalize"), req, { withCredentials: true });
}

// Upload client: gestisce sia form-data (fields presenti) che PUT binario
export async function uploadPresigned(uploadUrl: string, file: File, fields?: Record<string,string>): Promise<void> {
  if (fields && Object.keys(fields).length > 0) {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append('file', file);
    const resp = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    return;
  }
  const resp = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
}


// src/lib/attachments.service.ts
// Servizio TENANT (backoffice) per presign/finalize allegati del report detail V2

import { v1 } from "@/lib/api";

export type PresignReq = { fileName: string; mimeType: string; sizeBytes: number };
export type PresignRes = { uploadUrl: string; storageKey: string; headers?: Record<string,string>; proof?: string };

export async function presignAttachment(req: PresignReq): Promise<PresignRes> {
  const resp = await fetch(v1("tenant/reports/attachments/presign"), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ fileName: req.fileName, mimeType: req.mimeType, sizeBytes: req.sizeBytes }] }),
  });
  if (!resp.ok) throw new Error(`presign failed: ${resp.status}`);
  const raw: any = await resp.json();
  const first = Array.isArray(raw?.items) ? raw.items[0] : undefined;
  if (first && first.uploadUrl && first.storageKey) {
    return { uploadUrl: first.uploadUrl, storageKey: first.storageKey, headers: first.headers, proof: first.proof };
  }
  throw new Error('Invalid presign response: missing items[0].uploadUrl or items[0].storageKey');
}

export async function finalizeAttachment(input: { storageKey: string; sizeBytes: number; fileName: string; mimeType: string; etag?: string | null; proof?: string }): Promise<void> {
  const item: Record<string, any> = {
    storageKey: input.storageKey,
    sizeBytes: input.sizeBytes,
    fileName: input.fileName,
    mimeType: input.mimeType,
    ...(input.etag ? { etag: input.etag } : {}),
    ...(input.proof ? { hmac: input.proof } : {}),
  };
  const resp = await fetch(v1("tenant/reports/attachments/finalize"), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [item] }),
  });
  if (!resp.ok) throw new Error(`finalize failed: ${resp.status}`);
}

// Upload client: PUT binario (headers firmati dal presign); ritorna ETag se presente
export async function uploadPresigned(uploadUrl: string, file: File, headersIn?: Record<string,string>): Promise<string | null> {
  const headers = new Headers(headersIn || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', file.type || 'application/octet-stream');
  const resp = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  try { return resp.headers.get('ETag') || resp.headers.get('etag'); } catch { return null; }
}


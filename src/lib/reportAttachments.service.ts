// src/lib/reportAttachments.service.ts
// Servizi allegati per Admin FE (tenant): presign, finalize, list, download

import api, { v1 } from '@/lib/api';

// Types
export type PresignFile = { fileName: string; mimeType: string; sizeBytes?: number };
export type PresignResponseItem = {
  storageKey: string;
  method: 'PUT';
  uploadUrl: string;
  headers: Record<string, string>;
  maxSizeBytes: number;
  expiresIn: number; // seconds
  proof?: string;
};
export type FinalizeItem = {
  storageKey: string;
  etag?: string;
  sizeBytes: number;
  fileName: string;
  mimeType: string;
  hmac?: string;
};

// API
export async function presign(files: PresignFile[]): Promise<PresignResponseItem[]> {
  const { data } = await api.post(v1('tenant/reports/attachments/presign'), { files });
  return (data?.items || []) as PresignResponseItem[];
}

export async function finalize(items: FinalizeItem[]): Promise<any> {
  const { data } = await api.post(v1('tenant/reports/attachments/finalize'), { items });
  return data;
}

export async function listReportAttachments(reportId: string) {
  const { data } = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}/attachments`));
  return data;
}

export async function downloadAttachment(reportId: string, attachmentId: string) {
  const res = await api.get(v1(`tenant/reports/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}/download`), {
    responseType: 'blob',
  });
  return res.data as Blob;
}


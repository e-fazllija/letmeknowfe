// src/lib/publicCases.service.ts
import { api, ApiError, putAbsolute } from "./api";

type PresignReqItem = { fileName: string; mimeType: string; sizeBytes: number };
type PresignResItem = { uploadUrl: string; headers: Record<string, string>; storageKey: string; proof?: string };

export type PublicMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type PublicReport = {
  id: string;
  publicCode: string;
  status: string;
  title?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  eventDate?: string | null;
  privacy?: string;
  channel?: string;
  messages: PublicMessage[];
};

export type PublicStatusResponse = { message: string; report: PublicReport };

function q(params: Record<string, string | number | boolean | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// STATUS
export async function getPublicReportStatus(publicCode: string, secret: string) {
  const qs = q({ publicCode, secret });
  return api.get<PublicStatusResponse>(`/public/reports/status${qs}`);
}

// PRESIGN UPLOAD (reply attachments: png/jpeg/pdf/txt)
export async function presignPublicReportAttachments(files: PresignReqItem[]) {
  const res = await api.post<{ items: PresignResItem[] }>("/public/reports/attachments/presign", { files });
  return res.items || [];
}

// REPLY (includeThread=true per avere thread aggiornato)
export async function postPublicReportReply(input: {
  publicCode: string;
  secret: string;
  body: string;
  attachments?: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number; proof?: string }[];
  includeThread?: boolean;
}) {
  const { publicCode, secret, body, attachments = [], includeThread = true } = input;
  const qs = q({ includeThread });
  return api.post<{ report?: PublicReport }>(`/public/reports/reply${qs}`, { publicCode, secret, body, attachments });
}

export { ApiError, putAbsolute };


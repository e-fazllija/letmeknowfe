// src/lib/voice.service.ts
import { api } from "./api";

export type PresignVoiceRequestItem = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type PresignVoiceResponseItem = {
  uploadUrl: string;
  headers: Record<string, string>;
  storageKey: string;
  proof: string;
};

export async function presignVoiceAttachment(files: PresignVoiceRequestItem[]) {
  const res = await api.post<{ items: PresignVoiceResponseItem[] }>(
    "/public/voice/attachments/presign",
    { files }
  );
  return res.items || [];
}

export async function createVoiceReport(payload: any) {
  return api.post("/public/voice/reports", payload);
}

export async function transcribeVoice(storageKey: string) {
  return api.post<{ data?: { text?: string } }>("/public/voice/transcribe", {
    storageKey,
    includeAudio: true,
  });
}


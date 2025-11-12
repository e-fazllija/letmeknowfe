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

// New: transcribe by uploading the audio file as multipart (per backend split API)
export async function transcribeVoiceFromFile(file: Blob | File, opts?: { modelName?: string }) {
  const form = new FormData();
  const name = (file as any).name || "audio.webm";
  form.append("audio_file", file as any, name);
  if (opts?.modelName) form.append("modelName", opts.modelName);
  return api.post<{ text?: string; data?: { text?: string } }>("/public/voice/transcribe", form);
}

// New: upload audio as attachment to an existing report (no transcription)
export async function uploadVoiceAttachment(file: Blob | File, reportId: string, secret: string) {
  const form = new FormData();
  const name = (file as any).name || "voice_message.webm";
  form.append("audio_file", file as any, name);
  form.append("reportId", reportId);
  form.append("secret", secret);
  return api.post<{ attachmentId: string; reportId: string }>("/public/voice/transcribe/upload", form);
}


// src/lib/adminHandoff.ts
export const ADMIN_URL =
  import.meta.env.VITE_LMK_ADMIN_URL || "http://localhost:5173/";

// Codifica sicura UTF-8 → base64 (accenti/emoji ok)
function toBase64Utf8(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Payload che l'admin capisce
export type AdminImportPayload = {
  id?: string;
  createdAt?: string;
  reporterType?: "Anonimo" | "Confidenziale";
  source?: string;              // es. "Widget Web"
  department?: string;
  category?: string;
  description: string;          // ***obbligatorio***
  authorEmail?: string;
  attachments?: string[];
  title?: string;
  summary?: string;
};

// Apri l’admin su /reports con ?import=<base64>
export function openInAdmin(payload: AdminImportPayload, newTab = true) {
  const b64 = toBase64Utf8(payload);
  const url = `${ADMIN_URL}#/reports?import=${encodeURIComponent(b64)}`;
  if (newTab) window.open(url, "_blank", "noopener,noreferrer");
  else window.location.href = url;
}

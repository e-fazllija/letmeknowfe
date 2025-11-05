// src/lib/messages.format.ts
// Helper di formattazione messaggi per il dettaglio segnalazione

// Rimuove il prefisso "SYSTEM ..." in testa ai messaggi di sistema
export function stripSystemPrefix(body?: string): string {
  if (!body) return "";
  return body.replace(/^\s*SYSTEM\s*[-–—·:]?\s*/i, "").trim();
}

// Costruisce indice id->etichetta da dati già disponibili nel dettaglio (no chiamate extra)
export function buildUserIndex(report: any, currentUser?: any): Record<string, string> {
  const idx: Record<string, string> = {};
  const push = (u?: any) => {
    if (!u || !u.id) return;
    const label =
      (u.name && String(u.name).trim()) ||
      (u.fullName && String(u.fullName).trim()) ||
      (u.email && String(u.email).trim()) ||
      (u.username && String(u.username).trim()) ||
      undefined;
    if (label) idx[u.id] = label;
  };
  push(currentUser);
  push(report?.author);
  push(report?.createdBy);
  push(report?.assignee);
  push(report?.assignedTo);
  (report?.watchers || []).forEach(push);
  (report?.participants || []).forEach(push);
  (report?.messages || []).forEach((m: any) => push(m?.author));
  return idx;
}

// Sostituisce ID (cuid-like) con label se presente nell'indice
export function replaceUserIds(body: string, userIndex: Record<string, string>): string {
  if (!body) return "";
  return body.replace(/\b([a-z0-9]{20,})\b/gi, (match) => userIndex[match] || match);
}

// Etichetta opzionale accanto al badge SYSTEM: "admin" se l'autore è ADMIN o platform
export function systemSideLabel(msg: any): string | undefined {
  const role = msg?.author?.role?.toLowerCase?.();
  const isPlatform = msg?.author?.type === "PLATFORM" || msg?.author?.isPlatform === true;
  if (role === "admin" || isPlatform) return "admin";
  return undefined; // altrimenti niente
}


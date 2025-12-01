import { useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Notifica quando aumenta il numero di messaggi o arriva un messaggio con id non visto.
 * - Non notifica i messaggi presenti al primo render.
 * - Evita duplicati con un set di id visti.
 */
export function useNewMessageNotifier(params: {
  reportId?: string | number;
  messages: Array<{ id?: string | number; authorName?: string | null | undefined }>;
  currentUserEmail?: string | null; // opzionale per filtri futuri
}) {
  const { notify } = useNotifications();
  const booted = useRef(false);
  const seen = useRef(new Set<string | number>());
  const prevLen = useRef<number>(0);

  useEffect(() => {
    const { messages } = params;

    // al primo load, memorizza ma non notifica
    if (!booted.current) {
      messages.forEach(m => m?.id != null && seen.current.add(m.id));
      prevLen.current = messages.length;
      booted.current = true;
      return;
    }

    // nuovi messaggi per length aumentata
    if (messages.length > prevLen.current) {
      for (let i = prevLen.current; i < messages.length; i++) {
        const m = messages[i];
        if (!m) continue;
        const mid = m.id ?? `${i}`;
        if (!seen.current.has(mid)) {
          seen.current.add(mid);
          notify({
            title: "Nuovo messaggio sulla segnalazione",
            body: params.reportId != null ? `ID #${params.reportId} — da ${m.authorName ?? "utente"}` : `Da ${m.authorName ?? "utente"}`,
            link: params.reportId != null ? `#/reports/${params.reportId}` : undefined,
          });
        }
      }
    } else {
      // scan generale per id nuovi (es. reorder)
      messages.forEach((m) => {
        const mid = m?.id;
        if (mid != null && !seen.current.has(mid)) {
          seen.current.add(mid);
          notify({
            title: "Nuovo messaggio sulla segnalazione",
            body: params.reportId != null ? `ID #${params.reportId} — da ${m?.authorName ?? "utente"}` : `Da ${m?.authorName ?? "utente"}`,
            link: params.reportId != null ? `#/reports/${params.reportId}` : undefined,
          });
        }
      });
    }

    prevLen.current = messages.length;
  }, [params.messages, params.reportId, params.currentUserEmail, notify]);
}

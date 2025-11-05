// src/lib/notifications.service.ts
// Polling FE-only per notifiche (nuovi report, nuovi messaggi, eventi SLA)

import api, { v1 } from '@/lib/api';

const LS_KEY = 'lmw_notif_last_seen';

export type NotifItem = {
  id: string;              // "rep:<id>" | "msg:<id>"
  type: 'report' | 'message' | 'system';
  reportId: string;
  title: string;
  subtitle?: string;
  createdAt: string;       // ISO
};

// Helpers per etichetta SLA e snippet testo
export function labelFromNote(note?: string) {
  const n = String(note || '');
  if (!n) return 'Messaggio di sistema';
  if (n.startsWith('SLA_ACK_REMINDER_')) return 'Promemoria ACK';
  if (n.startsWith('SLA_RESPONSE_REMINDER_')) return 'Promemoria risposta';
  if (n === 'SLA_OVERDUE') return 'Segnalazione in ritardo';
  return 'Messaggio di sistema';
}

export function snippet(s?: string, max = 120) {
  if (!s) return '';
  const t = String(s).trim().replace(/\s+/g, ' ');
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export function getLastSeenAt(): string {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v && v.trim()) return v;
  } catch {}
  return new Date(0).toISOString();
}

export function setLastSeenNow(): void {
  try { localStorage.setItem(LS_KEY, new Date().toISOString()); } catch {}
}

const POLL_MS_DEFAULT = 30000;
const MAX_REPORTS_DEFAULT = 10;

export async function fetchNotificationSnapshot(): Promise<{ total: number; items: NotifItem[]; pollMs: number }>{
  const pollMs = Number(import.meta.env.VITE_NOTIF_POLL_MS || POLL_MS_DEFAULT) || POLL_MS_DEFAULT;
  const maxReports = Number(import.meta.env.VITE_NOTIF_MAX_REPORTS || MAX_REPORTS_DEFAULT) || MAX_REPORTS_DEFAULT;

  const lastSeen = getLastSeenAt();
  const since = new Date(lastSeen).toISOString();

  try {
    // 1) Report recenti
    const { data: reportsData } = await api.get(v1('tenant/reports'), {
      params: { page: 1, pageSize: 20, sort: '-createdAt' },
      withCredentials: true,
    });
    const reports = Array.isArray(reportsData) ? reportsData : [];

    const newReports: NotifItem[] = [];
    for (const r of reports) {
      const createdAt = String(r?.createdAt || '');
      if (!createdAt) continue;
      if (createdAt > since) {
        const rid = String(r?.id || r?.reportId || '');
        const subtitle = String(r?.publicCode || r?.subject || r?.summary || rid);
        newReports.push({ id: `rep:${rid}`, type: 'report', reportId: rid, title: 'Nuova segnalazione', subtitle, createdAt });
      }
    }

    // 2) Per i primi N report più recenti, estrai i messaggi recenti
    const recent = reports.slice(0, Math.max(1, maxReports));
    const items: NotifItem[] = [...newReports];

    for (const r of recent) {
      const rid = String(r?.id || r?.reportId || '');
      if (!rid) continue;
      try {
        const { data: msgs } = await api.get(v1(`tenant/reports/${encodeURIComponent(rid)}/messages`), {
          params: { page: 1, pageSize: 10, sort: '-createdAt', visibility: 'ALL' },
          withCredentials: true,
        });
        const list = Array.isArray(msgs) ? msgs : [];
        for (const m of list) {
          const createdAt = String(m?.createdAt || '');
          if (!createdAt || createdAt <= since) continue;
          const mid = String(m?.id || '');
          const vis = String(m?.visibility || '').toUpperCase();
          if (vis === 'SYSTEM' || String(m?.type || '').toUpperCase() === 'SYSTEM') {
            // SYSTEM: titolo fisso e niente sottotitolo
            items.push({ id: `msg:${mid}`, type: 'system', reportId: rid, title: 'Nuova assegnazione', createdAt });
          } else {
            // Nuovo messaggio (testo breve)
            const body = String(m?.body || m?.text || '').replace(/\s+/g, ' ').slice(0, 80);
            items.push({ id: `msg:${mid}`, type: 'message', reportId: rid, title: 'Nuovo messaggio', subtitle: body, createdAt });
          }
        }
      } catch {
        // ignora errori parziali sui messaggi
      }
    }

    // Ordina ascendente per createdAt
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { total: items.length, items, pollMs };
  } catch {
    // backoff semplificato a 45s in caso di errore
    return { total: 0, items: [], pollMs: 45000 };
  }
}

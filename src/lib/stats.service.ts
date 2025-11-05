// src/lib/stats.service.ts
import api, { v1, resolveChannel, getSavedTenantId } from "@/lib/api";
import { fetchDepartmentsPublic, fetchDepartmentsTenant, fetchCategoriesPublic, fetchCategoriesTenant } from "@/lib/lookups.service";

export type DashboardData = {
  kpis: {
    reports: number;
    avgDaysToReceive: number;
    avgDaysToClose: number;
    open: number;
  };
  byMonth: { date: string; count: number }[]; // "YYYY-MM"
  bySource: { name: string; value: number }[];
  byDepartment: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  statusOverTime: { date: string; Nuovo: number; Aperto: number; Chiuso: number }[];
};

/** Genera gli ultimi N mesi in formato "YYYY-MM" */
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    out.push(`${yyyy}-${mm}`);
  }
  return out;
}

const MONTHS = lastMonths(12);

function toYyyyMm(d: Date | string | number | null | undefined): string | null {
  if (!d) return null;
  const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return null;
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function daysBetween(a: string | Date | undefined | null, b: string | Date | undefined | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a as any);
  const db = new Date(b as any);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  const diff = (db.getTime() - da.getTime()) / (24 * 3600 * 1000);
  if (!isFinite(diff)) return null;
  return Math.max(0, diff);
}

type AnyReport = Record<string, any>;

/** Ritorna la migliore data di "presa in carico/ricezione" disponibile sul report */
function getReceivedAt(r: AnyReport): string | undefined {
  return (
    r?.receivedAt ||
    r?.received_at ||
    r?.ackAt ||
    r?.ack_at ||
    r?.firstResponseAt ||
    r?.first_response_at ||
    r?.assignedAt ||
    r?.assigned_at ||
    undefined
  );
}

/** Ritorna la migliore data di chiusura disponibile sul report */
function getClosedAt(r: AnyReport): string | undefined {
  return (
    r?.closedAt ||
    r?.closed_at ||
    r?.resolvedAt ||
    r?.resolved_at ||
    (String(r?.status || "").toUpperCase() === "CLOSED" ? r?.updatedAt || r?.updated_at : undefined)
  );
}

function getDepartmentId(r: AnyReport): string | null {
  const id = r?.departmentId || r?.department_id || null;
  return id ? String(id) : null;
}
function getDepartmentName(r: AnyReport): string | null {
  const name = r?.departmentName || r?.department || r?.department_name || null;
  return name ? String(name) : null;
}

function getCategoryId(r: AnyReport): string | null {
  const id = r?.categoryId || r?.category_id || null;
  return id ? String(id) : null;
}
function getCategoryName(r: AnyReport): string | null {
  const name = r?.categoryName || r?.category || r?.category_name || null;
  return name ? String(name) : null;
}

function looksLikeId(s: string | null | undefined): boolean {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  if (/\s/.test(t)) return false; // names usually contain spaces; IDs seldom do
  if (t.length >= 12 && /^[0-9a-f-]{12,}$/i.test(t)) return true; // uuid-ish
  if (t.length >= 16 && /^[a-z0-9_-]{16,}$/i.test(t)) return true; // cuid/nanoid-ish
  return false;
}

function normalizeSourceName(r: AnyReport): string {
  const raw = (r?.sourceName || r?.source || r?.channel) as string | undefined;
  const ch = resolveChannel({ channel: r?.channel, source: r?.source });
  const val = String(raw || ch || "OTHER").toUpperCase();
  switch (val) {
    case "WEB": return "Web";
    case "PHONE": return "Telefono";
    case "EMAIL": return "Email";
    case "OTHER":
    case "ALTRO": return "Altro";
    default:
      // mantieni eventuali etichette custom dal BE (es. "Linea etica")
      return raw ? String(raw) : String(val);
  }
}

/**
 * Calcola i dati della dashboard a partire dalla lista report del BE.
 */
export async function getDashboardData(): Promise<DashboardData> {
  // Carica un numero adeguato di report (ultimo anno). Se il BE supporta filtri data, aggiungeremo dateFrom/dateTo.
  const clientId = getSavedTenantId();
  const params: Record<string, any> = { page: 1, pageSize: 1000 };
  if (clientId) params.clientId = clientId;

  const { data } = await api.get(v1("tenant/reports"), { params, withCredentials: true });
  const items: AnyReport[] = Array.isArray(data) ? data : [];

  // Mappe di aggregazione
  const byMonthCount = new Map<string, number>();
  const bySourceCount = new Map<string, number>();
  // Reparti: preferisci aggregazione per ID, con mappa id->nome
  const deptCountById = new Map<string, number>();
  const deptNameById = new Map<string, string>();
  const deptCountByNameOnly = new Map<string, number>();
  // Categorie: preferisci aggregazione per ID, con mappa id->nome
  const catCountById = new Map<string, number>();
  const catNameById = new Map<string, string>();
  const catCountByNameOnly = new Map<string, number>();
  const statusByMonth = new Map<string, { Nuovo: number; Aperto: number; Chiuso: number }>();

  // KPI helpers
  let openCount = 0;
  const receiveDiffs: number[] = [];
  const closeDiffs: number[] = [];

  for (const r of items) {
    const created = r?.createdAt || r?.created_at;
    const updated = r?.updatedAt || r?.updated_at;
    const ym = toYyyyMm(created);
    const status = String(r?.status || "").toUpperCase();

    if (status === "OPEN") openCount++;

    // byMonth (ultimi 12 mesi)
    if (ym && MONTHS.includes(ym)) {
      byMonthCount.set(ym, (byMonthCount.get(ym) || 0) + 1);
    }

    // bySource
    const src = normalizeSourceName(r);
    bySourceCount.set(src, (bySourceCount.get(src) || 0) + 1);

    // byDepartment (ID preferito; fallback nome)
    let depId = getDepartmentId(r);
    let depName = getDepartmentName(r);
    if (!depId && depName && looksLikeId(depName)) {
      // Field 'department' actually contains an ID
      depId = depName;
      depName = null;
    }
    if (depId) {
      deptCountById.set(depId, (deptCountById.get(depId) || 0) + 1);
      if (depName) deptNameById.set(depId, depName);
    } else if (depName) {
      const key = depName;
      deptCountByNameOnly.set(key, (deptCountByNameOnly.get(key) || 0) + 1);
    }

    // byCategory (ID preferito; fallback nome)
    let catId = getCategoryId(r);
    let catName = getCategoryName(r);
    if (!catId && catName && looksLikeId(catName)) {
      // Field 'category' actually contains an ID
      catId = catName;
      catName = null;
    }
    if (catId) {
      catCountById.set(catId, (catCountById.get(catId) || 0) + 1);
      if (catName) catNameById.set(catId, catName);
    } else if (catName) {
      const key = catName;
      catCountByNameOnly.set(key, (catCountByNameOnly.get(key) || 0) + 1);
    }

    // statusOverTime
    if (ym && MONTHS.includes(ym)) {
      const bucket = statusByMonth.get(ym) || { Nuovo: 0, Aperto: 0, Chiuso: 0 };
      if (status === "CLOSED") bucket.Chiuso += 1;
      else if (status === "OPEN") bucket.Nuovo += 1;
      else bucket.Aperto += 1; // IN_PROGRESS / SUSPENDED / NEED_INFO -> "Aperto"
      statusByMonth.set(ym, bucket);
    }

    // KPI: giorni alla ricezione / chiusura
    const rec = getReceivedAt(r);
    const cls = getClosedAt(r);
    const dReceive = daysBetween(created, rec);
    const dClose = daysBetween(created, cls || (status === "CLOSED" ? updated : null));
    if (dReceive != null) receiveDiffs.push(dReceive);
    if (dClose != null) closeDiffs.push(dClose);
  }

  const byMonth = MONTHS.map((m) => ({ date: m, count: byMonthCount.get(m) || 0 }));

  const bySource = Array.from(bySourceCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Prova a risolvere sempre i nomi per ID mancanti tramite lookups
  let byDepartment: { name: string; value: number }[] = [];
  {
    const missingDepIds: string[] = [];
    for (const id of deptCountById.keys()) {
      if (!deptNameById.has(id)) missingDepIds.push(id);
    }
    if (missingDepIds.length) {
      try {
        const deps = await fetchDepartmentsPublic();
        for (const d of deps) {
          if (missingDepIds.includes(d.id)) deptNameById.set(d.id, d.name);
        }
      } catch { /* ignore lookup errors */ }
      try {
        const depsT = await fetchDepartmentsTenant();
        for (const d of depsT) {
          if (missingDepIds.includes(d.id)) deptNameById.set(d.id, d.name);
        }
      } catch { /* ignore */ }
    }
    const fromIds = Array.from(deptCountById.entries()).map(([id, value]) => ({ name: deptNameById.get(id) || "Senza reparto", value }));
    const fromNames = Array.from(deptCountByNameOnly.entries()).map(([name, value]) => ({ name, value }));
    byDepartment = [...fromIds, ...fromNames].sort((a, b) => b.value - a.value);
  }

  // Costruisci byCategory con lookups per nomi
  let byCategory: { name: string; value: number }[] = [];
  {
    const missingCatIds: string[] = [];
    for (const id of catCountById.keys()) {
      if (!catNameById.has(id)) missingCatIds.push(id);
    }
    if (missingCatIds.length) {
      try {
        const cats = await fetchCategoriesPublic();
        for (const c of cats) {
          if (missingCatIds.includes(c.id)) catNameById.set(c.id, c.name);
        }
      } catch { /* ignore lookup errors */ }
      try {
        const catsT = await fetchCategoriesTenant();
        for (const c of catsT) {
          if (missingCatIds.includes(c.id)) catNameById.set(c.id, c.name);
        }
      } catch { /* ignore */ }
    }
    const fromIds = Array.from(catCountById.entries()).map(([id, value]) => ({ name: catNameById.get(id) || "Senza categoria", value }));
    const fromNames = Array.from(catCountByNameOnly.entries()).map(([name, value]) => ({ name, value }));
    byCategory = [...fromIds, ...fromNames].sort((a, b) => b.value - a.value);
  }

  const statusOverTime = MONTHS.map((m) => ({
    date: m,
    Nuovo: statusByMonth.get(m)?.Nuovo || 0,
    Aperto: statusByMonth.get(m)?.Aperto || 0,
    Chiuso: statusByMonth.get(m)?.Chiuso || 0,
  }));

  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : 0);

  const kpis = {
    reports: items.length,
    avgDaysToReceive: Math.round(avg(receiveDiffs)),
    avgDaysToClose: Math.round(avg(closeDiffs)),
    open: openCount,
  };

  return { kpis, byMonth, bySource, byDepartment, byCategory, statusOverTime };
}

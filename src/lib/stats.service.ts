// src/lib/stats.service.ts

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

// Mock dati coerenti con la UI
const MOCK: DashboardData = {
  kpis: {
    reports: 42,
    avgDaysToReceive: 3,
    avgDaysToClose: 18,
    open: 7,
  },
  byMonth: MONTHS.map((m, i) => ({
    date: m,
    count: [2, 3, 4, 3, 5, 2, 4, 3, 5, 4, 6, 5][i % 12],
  })),
  bySource: [
    { name: "Altro", value: 6 },
    { name: "Email", value: 7 },
    { name: "Canale ANAC", value: 5 },
    { name: "Collega", value: 8 },
    { name: "HR", value: 6 },
    { name: "IT", value: 4 },
    { name: "Internal Audit", value: 3 },
    { name: "Linea etica", value: 3 },
  ],
  byDepartment: [
    { name: "Amministrazione", value: 6 },
    { name: "HR", value: 7 },
    { name: "IT", value: 5 },
    { name: "Vendite", value: 8 },
    { name: "Marketing", value: 6 },
    { name: "Produzione", value: 4 },
    { name: "Logistica", value: 3 },
    { name: "Finanza", value: 3 },
    { name: "Legale", value: 2 },
  ],
  statusOverTime: MONTHS.map((m, i) => ({
    date: m,
    Nuovo: [1, 2, 2, 1, 3, 1, 2, 2, 3, 2, 3, 2][i % 12],
    Aperto: [2, 2, 3, 2, 2, 1, 3, 2, 2, 3, 2, 3][i % 12],
    Chiuso: [1, 1, 2, 2, 1, 1, 2, 1, 3, 2, 1, 2][i % 12],
  })),
};

/**
 * Restituisce i dati per la dashboard.
 * Per ora è un mock locale: se/quando avrai un endpoint BE,
 * potremo sostituire con: const { data } = await api.get("/tenant/stats");
 */
export async function getDashboardData(): Promise<DashboardData> {
  // Simula latenza minima (opzionale)
  await new Promise((r) => setTimeout(r, 50));
  return MOCK;
}

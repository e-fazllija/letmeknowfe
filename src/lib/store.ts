export type ReportKind = "text" | "voice";

export type Report = {
  code: string;
  secret: string;
  kind: ReportKind;
  createdAt: number;
  status: "Inviata" | "In lavorazione" | "Chiusa";
  data: any; // payload libero
  messages: { ts: number; text: string }[];
};

const KEY = "lmw_reports_v1";

/* -------------------- Helpers per storage -------------------- */
function loadAll(): Record<string, Report> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Report>) : {};
  } catch {
    return {};
  }
}

function saveAll(db: Record<string, Report>) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* -------------------- Generazione codici -------------------- */
function randHex(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 16).toString(16).toUpperCase()).join("");
}

function genCode() {
  return `R-${randHex(4)}-${randHex(4)}`;
}

function genSecret() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

/* -------------------- Creazione report -------------------- */
export function createTextReport(data: any) {
  const db = loadAll();
  const code = genCode();
  const secret = genSecret();
  db[code] = {
    code,
    secret,
    kind: "text",
    createdAt: Date.now(),
    status: "Inviata",
    data,
    messages: [],
  };
  saveAll(db);
  return { code, secret };
}

export function createVoiceReport(data: any) {
  const db = loadAll();
  const code = genCode();
  const secret = genSecret();
  db[code] = {
    code,
    secret,
    kind: "voice",
    createdAt: Date.now(),
    status: "Inviata",
    data,
    messages: [],
  };
  saveAll(db);
  return { code, secret };
}

/* -------------------- Lettura e query -------------------- */
export function getReport(code: string, secret: string): Report | null {
  const db = loadAll();
  const r = db[code];
  if (!r || r.secret !== secret) return null;
  return r;
}

/**
 * Cerca una pratica conoscendo solo il codice segreto.
 * Restituisce l'intero Report se trovato, altrimenti null.
 */
export function getReportBySecret(secret: string): Report | null {
  const db = loadAll();
  const values = Object.values(db);
  return values.find((r) => r.secret === secret.trim()) ?? null;
}

/* -------------------- Aggiungi chiarimenti -------------------- */
export function addClarification(code: string, secret: string, text: string) {
  const db = loadAll();
  const r = db[code];
  if (!r || r.secret !== secret) throw new Error("Accesso negato");
  r.messages.push({ ts: Date.now(), text });
  saveAll(db);
}

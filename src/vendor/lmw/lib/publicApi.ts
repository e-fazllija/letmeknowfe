// src/lib/publicApi.ts
// Client pubblico per le API: crea/consulta/reply segnalazioni

export type CreateWebPayload = Record<string, unknown>;
export type CreateVoicePayload = Record<string, unknown>;

export type CreateResponse = {
  reportId: string;
  publicCode: string;
  secret: string;
};

export type PublicThreadMessage = {
  id?: string;
  ts?: string | number;
  author?: 'PUBLIC' | 'STAFF' | string;
  body: string;
  attachments?: { name: string; url?: string }[];
};

export type PublicReport = {
  reportId: string;
  publicCode?: string;
  status: string;
  messages: PublicThreadMessage[];
};

export type PublicReplyInput = {
  publicCode: string;
  secret: string;
  body: string;
  attachments?: { name: string; size?: number; type?: string }[];
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
// Default '/v1' when not provided to ensure Vite proxy in dev
const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || '/v1';

function readTenantId(): string {
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQs = (qs.get('tenant') || '').trim();
    if (fromQs) return fromQs;
  } catch {}
  try {
    const fromLs = (localStorage.getItem('lmw_tenant_id') || '').trim();
    if (fromLs) return fromLs;
  } catch {}
  const fromEnv = (((import.meta as any).env?.VITE_PUBLIC_TENANT_ID as string) || '').trim();
  return fromEnv;
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1);
  if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
  return base + path;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

  // Invia x-tenant-id quando disponibile (anche in dev) per rotte non-public
  try {
    const tenant = readTenantId();
    if (tenant) headers['x-tenant-id'] = String(tenant);
  } catch {}

  const res = await fetch(input, { ...init, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {
      // ignore
    }
    // Messaggi chiari per 429/501
    if (res.status === 429) {
      throw new ApiError(429, 'Troppe richieste: attendi e riprova.');
    }
    if (res.status === 501) {
      throw new ApiError(501, 'Funzionalità non disponibile (presign allegati non abilitato).');
    }
    throw new ApiError(res.status, msg);
  }
  // prova a parse json, altrimenti ritorna void
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}

export const publicApi = {
  async createReportWeb(payload: CreateWebPayload): Promise<CreateResponse> {
    const url = joinUrl(API_BASE, `${API_PREFIX}/public/reports`);
    return http<CreateResponse>(url, { method: 'POST', body: JSON.stringify(payload) });
  },

  async createReportVoice(payload: CreateVoicePayload): Promise<CreateResponse> {
    const url = joinUrl(API_BASE, `${API_PREFIX}/public/voice/reports`);
    return http<CreateResponse>(url, { method: 'POST', body: JSON.stringify(payload) });
  },

  async getReportBySecret(secret: string): Promise<PublicReport> {
    const safe = encodeURIComponent(secret);
    const url = joinUrl(API_BASE, `${API_PREFIX}/tenant/reports/token/${safe}`);
    return http<PublicReport>(url, { method: 'GET' });
  },

  async publicReply(input: PublicReplyInput): Promise<void> {
    const url = joinUrl(API_BASE, `${API_PREFIX}/public/reports/reply`);
    await http<void>(url, { method: 'POST', body: JSON.stringify(input) });
  },

  // Tentativo di presign per allegati: se il backend risponde 501, lo comunichiamo al chiamante
  // Nota: l'endpoint specifico può variare; lasciamo un NO-OP sicuro se non configurato.
  async tryPresign(files: { name: string; size?: number; type?: string }[]): Promise<'ok' | 'unavailable'> {
    // Se non abbiamo base/prefix, non tentiamo.
    if (!API_BASE && !API_PREFIX) return 'unavailable';
    const url = joinUrl(API_BASE, `${API_PREFIX}/public/attachments/presign`);
    try {
      await http(url, { method: 'POST', body: JSON.stringify({ files }) });
      return 'ok';
    } catch (e) {
      if (e instanceof ApiError && e.status === 501) return 'unavailable';
      // per altri errori non blocchiamo, ma segnaliamo indisponibile
      return 'unavailable';
    }
  },
};

export { ApiError };


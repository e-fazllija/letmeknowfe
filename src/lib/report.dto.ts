// src/lib/report.dto.ts

// Enum allineati al backend
export type ReportChannel = "WEB" | "PHONE" | "EMAIL" | "OTHER";
export type ReportStatus  = "OPEN" | "IN_PROGRESS" | "SUSPENDED" | "CLOSED";

// === AUTH DTO ===
export type ApiRole = "ADMIN" | "AGENT"; // estendi se il BE ne ha altri

export interface SignupDto {
  clientId: string;
  email: string;
  password: string;
  role: ApiRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

// === REPORT DTO (request body esatto che mi hai dato) ===
export interface CreateTenantReportDto {
  clientId: string;
  title: string;
  summary?: string;
  status?: ReportStatus;     // default "OPEN"
  channel?: ReportChannel;   // default "WEB"
}

// Alias retro-compatibili per file esistenti (es. stats.service.ts)
export type CreateReportDto = CreateTenantReportDto;

export interface UpdateReportStatusDto {
  reportId: string;
  status: ReportStatus;
  note?: string;
}

// (facoltativo) tipo di risposta del BE
export interface ReportCounters {
  messagesTotal?: number;
  publicMessages?: number;
  internalMessages?: number;
}

export type ReportPrivacy = "PUBLIC" | "INTERNAL";

export interface Report {
  id: string;
  clientId?: string;
  title?: string;
  summary?: string;
  status: ReportStatus;
  priority?: string;
  category?: string;
  assignee?: string;
  channel: ReportChannel;
  privacy?: ReportPrivacy; // opzionale: derivabile da channel nel FE
  hasAttachments?: boolean;
  counters?: ReportCounters;
  publicCode?: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  [k: string]: any;
}

export type ReportMessageType = "INTERNAL" | "PUBLIC";

export interface AttachmentRef {
  id: string;
  name: string;
  size?: number;
  contentType?: string;
  // eventuale URL presignato quando disponibile lato BE
  url?: string;
}

export interface ReportMessage {
  id: string;
  reportId: string;
  type: ReportMessageType;
  author?: string;
  body: string;
  attachments?: AttachmentRef[];
  createdAt: string;
  [k: string]: any;
}

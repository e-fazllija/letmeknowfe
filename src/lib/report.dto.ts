// src/lib/report.dto.ts

export type ReporterType = "Anonimo" | "Confidenziale";

export interface AttachmentMeta {
  name: string;
  size?: number;
  type?: string;
}

export interface ReportCreateDTO {
  /** Tipo segnalante: Anonimo / Confidenziale */
  reporterType: ReporterType;

  /** Se Confidenziale */
  name?: string;
  email?: string;

  /** Contenuti principali */
  title: string;
  category: string;
  description: string;

  /** Opzionali */
  department?: string;
  attachments?: AttachmentMeta[];
  source?: string;      // es. "Widget Web" | "Portale Web"
  createdAt?: string;   // ISO, se omesso lo mette il server/app
}

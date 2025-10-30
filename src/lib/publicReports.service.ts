// src/lib/publicReports.service.ts
// Service per API pubbliche: lookups, presign/finalize allegati, creazione report

import { api, ApiError } from './api';

export type Department = { id: string; name: string };
export type Category = { id: string; name: string; departmentId?: string };

export type PresignRequestItem = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type PresignResponseItem = {
  uploadUrl: string;
  method: string; // es. 'PUT'
  headers: Record<string, string>;
  storageKey: string;
  proof: string;
};

export type FinalizeItem = {
  storageKey: string;
  etag: string;
  sizeBytes: number;
  fileName: string;
  mimeType: string;
  hmac?: string;
};

export type CreateReportAttachment = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  proof: string;
};

export type CreateReportInput = {
  date: string; // ISO
  source: 'WEB' | 'PHONE' | string;
  privacy: 'ANONIMO' | 'CONFIDENZIALE';
  subject: string;
  description: string;
  departmentId?: string;
  categoryId?: string;
  attachments?: CreateReportAttachment[];
};

export type CreateReportResponse = {
  reportId: string;
  publicCode: string;
  secret: string;
  createdAt: string;
};

const PRESIGN_ENABLED = String((import.meta as any).env?.VITE_PRESIGN_ENABLED || '').toLowerCase() === 'true';

export const publicReports = {
  async listPublicDepartments(): Promise<Department[]> {
    try {
      const data = await api.get<Department[]>('/public/departments');
      try { if ((import.meta as any).env?.DEV) console.log('[widget] departments →', data); } catch { /* noop */ }
      return data;
    } catch (err) {
      try { console.error('[widget] departments fetch error:', err); } catch { /* noop */ }
      throw err;
    }
  },

  async listPublicCategories(departmentId: string): Promise<Category[]> {
    const q = new URLSearchParams({ departmentId });
    try {
      const data = await api.get<Category[]>(`/public/categories?${q.toString()}`);
      try { if ((import.meta as any).env?.DEV) console.log('[widget] categories →', data); } catch { /* noop */ }
      return data;
    } catch (err) {
      try { console.error('[widget] categories fetch error:', err); } catch { /* noop */ }
      throw err;
    }
  },

  async presignPublicAttachment(files: File[]): Promise<PresignResponseItem[]> {
    if (!PRESIGN_ENABLED || files.length === 0) return [];
    const items: PresignRequestItem[] = files.map((f) => ({ fileName: f.name, mimeType: f.type || 'application/octet-stream', sizeBytes: f.size }));
    const res = await api.post<{ items: PresignResponseItem[] }>(`/public/reports/attachments/presign`, { items });
    return res.items || [];
  },

  async finalizePublicAttachment(items: FinalizeItem[]): Promise<void> {
    if (!PRESIGN_ENABLED || items.length === 0) return;
    await api.post<void>(`/public/reports/attachments/finalize`, { items });
  },

  async createPublicReport(data: CreateReportInput): Promise<CreateReportResponse> {
    return api.post<CreateReportResponse>(`/public/reports`, data);
  },
};

export { ApiError };

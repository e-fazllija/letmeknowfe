export type AuditorReportDetail = {
  id: string;
  status: 'OPEN'|'IN_PROGRESS'|'NEED_INFO'|'CLOSED';
  department: string | null;
  category: string | null;
  assignedTo?: { id: string; name: string; role: 'ADMIN' | 'AGENT' };
  reporter: { alias: string };
  createdAt: string;
  assignedAt?: string | null;
  inProgressAt?: string | null;
  acknowledgeAt?: string | null;
  messages: { id: string; type: 'INTERNAL'|'PUBLIC'; createdAt: string; authorRole?: string; content: string }[];
  attachments: { id: string; mime: string; size: number; previewUrl: string }[];
};


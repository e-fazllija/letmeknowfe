export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'NUOVO',
  IN_PROGRESS: 'IN LAVORAZIONE',
  SUSPENDED: 'SOSPESO',
  NEED_INFO: 'IN ATTESA DI INFORMAZIONI',
  CLOSED: 'CHIUSO',
};

export function statusToLabel(status?: string | null): string {
  const s = String(status || '').toUpperCase();
  return STATUS_LABELS[s] ?? (status || '-');
}


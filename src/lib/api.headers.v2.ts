// src/lib/api.headers.v2.ts
// Interceptor additivo: x-tenant-id SOLO sulle rotte public whitelisted
// e CSRF condizionale (X-CSRF-Token) SOLO sulle mutate tenant.
// Non tocca Authorization (cookie-first) e non modifica il refresh 401.

import api, { getSavedTenantId } from "@/lib/api";

// TenantId risolto dallo storage/ambiente (già usato altrove)
function getTenantId(): string | undefined { return getSavedTenantId(); }

function getCookie(name: string): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

const CSRF_PROTECTION = String((import.meta as any).env?.VITE_CSRF_PROTECTION || '').toLowerCase() === 'true';

api.interceptors.request.use((cfg) => {
  const method = String(cfg.method || '').toLowerCase();
  const urlStr = String(cfg.url || '').toLowerCase();
  const path = (() => {
    try {
      if (/^https?:\/\//.test(urlStr)) {
        const u = new URL(urlStr);
        return (u.pathname + (u.search || '')).toLowerCase();
      }
      const s = urlStr.startsWith('/') ? urlStr : '/' + urlStr;
      return s.toLowerCase();
    } catch { return urlStr; }
  })();

  const isPublicLookup = path.includes('/public/departments') || path.includes('/public/categories');
  const isPublicAttachment = method === 'post' && (
    path.endsWith('/public/reports/attachments/presign') ||
    path.endsWith('/public/reports/attachments/finalize')
  );

  const isTenantMutating = (() => {
    if (!(method === 'post' || method === 'patch' || method === 'delete' || method === 'put')) return false;
    const p = path;
    if (p.endsWith('/tenant/reports/message')) return true; // POST message
    if (/\/tenant\/reports\/[^/]+\/status(\?|$)/.test(p)) return true; // PATCH status
    if (/\/tenant\/reports\/[^/]+\/assign\/me(\?|$)/.test(p)) return true; // POST assign/me
    if (/\/tenant\/reports\/[^/]+\/assign(\?|$)/.test(p)) return true; // POST assign
    if (/\/tenant\/reports\/[^/]+\/unassign(\?|$)/.test(p)) return true; // POST unassign
    if (/\/tenant\/reports\/[^/]+\/message\/[^/]+\/(note|body)(\?|$)/.test(p)) return true; // PATCH note/body
    if (/\/tenant\/reports\/[^/]+\/take(\?|$)/.test(p)) return true; // POST take
    if (/\/tenant\/reports\/[^/]+\/auditors(\?|$)/.test(p)) return true; // assign/unassign auditor
    if (/\/tenant\/reports\/[^/]+\/my-note(\?|$)/.test(p)) return true; // PUT/DELETE my-note
    if (/\/tenant\/reports\/[^/]+\/attachments(\?|$)/.test(p)) return true; // POST attach-to-report
    return false;
  })();

  // Appendi un transformRequest per aggiungere header DOPO tutti gli altri interceptor
  const prev = cfg.transformRequest;
  const arr = Array.isArray(prev) ? prev.slice() : (prev ? [prev] : []);
  arr.push((data: any, headers?: any) => {
    try {
      if (isPublicLookup || isPublicAttachment) {
        const tid = getTenantId();
        if (tid) headers['x-tenant-id'] = tid;
      }
      if (CSRF_PROTECTION && isTenantMutating) {
        const xsrf = getCookie('XSRF-TOKEN');
        if (xsrf) headers['X-CSRF-Token'] = xsrf;
      }
    } catch { /* ignore */ }
    return data;
  });
  cfg.transformRequest = arr;

  return cfg;
});

export {};

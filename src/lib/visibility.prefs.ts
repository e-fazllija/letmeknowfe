import { getSavedTenantId } from "@/lib/api";

const DEP_KEY_PREFIX = "lmw_hidden_deps:";
const CAT_KEY_PREFIX = "lmw_hidden_cats:";

function tenantKey(): string {
  try {
    const tid = getSavedTenantId();
    const val = String(tid || "").trim();
    return val || "default";
  } catch {
    return "default";
  }
}

function readSet(prefix: string): Set<string> {
  try {
    const key = `${prefix}${tenantKey()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map((v) => String(v)));
  } catch { /* ignore */ }
  return new Set();
}

function writeSet(prefix: string, ids: Set<string>) {
  try {
    const key = `${prefix}${tenantKey()}`;
    const arr = Array.from(ids);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch { /* ignore */ }
}

export function getHiddenDepartmentIds(): Set<string> {
  return readSet(DEP_KEY_PREFIX);
}

export function getHiddenCategoryIds(): Set<string> {
  return readSet(CAT_KEY_PREFIX);
}

export function isDepartmentHidden(id: string): boolean {
  return getHiddenDepartmentIds().has(String(id));
}

export function isCategoryHidden(id: string): boolean {
  return getHiddenCategoryIds().has(String(id));
}

export function setDepartmentVisible(id: string, visible: boolean) {
  const ids = getHiddenDepartmentIds();
  const key = String(id);
  if (visible) ids.delete(key); else ids.add(key);
  writeSet(DEP_KEY_PREFIX, ids);
}

export function setCategoryVisible(id: string, visible: boolean) {
  const ids = getHiddenCategoryIds();
  const key = String(id);
  if (visible) ids.delete(key); else ids.add(key);
  writeSet(CAT_KEY_PREFIX, ids);
}


const LS_KEY = "lmw_archived_reports";

const chanName = "lmw_archived_reports_channel";
let bc: BroadcastChannel | null = null;
try {
  bc = new BroadcastChannel(chanName);
} catch {}

export function loadArchivedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function persist(set: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  if (bc) bc.postMessage({ type: "archived:update" });
}

export function archiveAdd(id: string) {
  const s = loadArchivedIds();
  s.add(id);
  persist(s);
}

export function archiveRemove(id: string) {
  const s = loadArchivedIds();
  s.delete(id);
  persist(s);
}

export function archiveHas(id: string) {
  return loadArchivedIds().has(id);
}

import { useEffect, useState } from "react";
export function useArchive() {
  const [ids, setIds] = useState<Set<string>>(loadArchivedIds());

  useEffect(() => {
    const onMsg = () => setIds(loadArchivedIds());
    if (bc) bc.addEventListener("message", onMsg as any);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setIds(loadArchivedIds());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      if (bc) bc.removeEventListener("message", onMsg as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const add = (id: string) => {
    archiveAdd(id);
    setIds(loadArchivedIds());
  };
  const remove = (id: string) => {
    archiveRemove(id);
    setIds(loadArchivedIds());
  };
  const has = (id: string) => ids.has(id);

  return { ids, add, remove, has };
}


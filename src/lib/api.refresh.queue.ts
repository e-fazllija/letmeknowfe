// src/lib/api.refresh.queue.ts
// Single-flight refresh queue for cookie-first auth.
// Ensures only ONE /tenant/auth/refresh runs at a time and others wait.

type VoidFn = () => void;

let refreshing = false;
const waiters: VoidFn[] = [];

/** Call this when a 401 happens to run (or wait for) a refresh. */
export async function ensureRefreshed(runRefresh: () => Promise<void>): Promise<void> {
  if (refreshing) {
    await new Promise<void>((resolve) => waiters.push(resolve));
    return;
  }
  refreshing = true;
  try {
    await runRefresh();
  } finally {
    refreshing = false;
    while (waiters.length) {
      const w = waiters.shift();
      if (w) w();
    }
  }
}

export type RefreshScope = "fx" | "crypto";

// The Fly app runs on one always-on Machine. Schedule after completion so
// provider requests never overlap, and retry a failed source after five minutes.
export function startValuationScheduler(
  refresh: (scope: RefreshScope) => Promise<void>,
  onError: (scope: RefreshScope) => void = (scope) => console.error("[finance] refresh failed", { scope }),
) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const due = { fx: 0, crypto: 0 };
  const interval = { fx: 24 * 60 * 60 * 1000, crypto: 60 * 60 * 1000 };

  function schedule(delay: number) {
    timer = setTimeout(async () => {
      for (const scope of ["fx", "crypto"] as const) {
        if (stopped) break;
        if (Date.now() < due[scope]) continue;
        try {
          await refresh(scope);
          due[scope] = Date.now() + interval[scope];
        } catch {
          due[scope] = Date.now() + 5 * 60 * 1000;
          onError(scope);
        }
      }
      if (!stopped) schedule(60 * 1000);
    }, delay);
    timer.unref?.();
  }
  schedule(1000);
  return () => { stopped = true; clearTimeout(timer); };
}


const runtime = globalThis as typeof globalThis & { lifeOsFinanceRefreshQueue?: Promise<void> };

// The cron route and scheduler share the queue even when bundled separately.
export function serializeValuationRefresh<T>(refresh: () => Promise<T>): Promise<T> {
  const result = (runtime.lifeOsFinanceRefreshQueue ?? Promise.resolve()).then(refresh);
  runtime.lifeOsFinanceRefreshQueue = result.then(() => {}, () => {});
  return result;
}

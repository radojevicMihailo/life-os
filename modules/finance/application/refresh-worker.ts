import "server-only";
import { refreshProductionValuations } from "./production-refresh";
import { startValuationScheduler } from "./refresh-scheduler";

const runtime = globalThis as typeof globalThis & { lifeOsFinanceStop?: () => void };

export function startFinanceRefreshWorker() {
  if (runtime.lifeOsFinanceStop) return;
  runtime.lifeOsFinanceStop = startValuationScheduler(async (scope) => {
    const result = await refreshProductionValuations(scope);
    console.log("[finance] refresh completed", { scope, ...result });
    if (result.failedCount > 0) throw new Error("partial_refresh");
  });
  console.log("[finance] refresh scheduler started: FX daily, crypto hourly");
}

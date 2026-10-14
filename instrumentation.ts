export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.FINANCE_REFRESH_ENABLED === "1") {
    const { startFinanceRefreshWorker } = await import("./modules/finance/application/refresh-worker");
    startFinanceRefreshWorker();
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.PUSH_REMINDERS_ENABLED === "1") {
    const { startPushWorker } = await import("./lib/notifications/worker");
    startPushWorker();
  }
}

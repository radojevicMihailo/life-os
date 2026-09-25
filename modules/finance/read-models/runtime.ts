import type { ApplicationDependencies } from "../application/ports";

export async function loadReadModelRuntime() {
  const [{ env }, { unitOfWork }] = await Promise.all([
    import("../config/env"),
    import("../db/unit-of-work"),
  ]);
  const dependencies: ApplicationDependencies = {
    clock: { now: () => new Date() },
    ids: {
      nextId() {
        throw new Error("read_model_cannot_generate_ids");
      },
    },
    unitOfWork,
  };

  return {
    dependencies,
    valuationOptions: {
      exchangeRateStaleAfterMs:
        env.EXCHANGE_RATE_STALE_AFTER_HOURS * 60 * 60 * 1_000,
      marketDataStaleAfterMs:
        env.MARKET_DATA_STALE_AFTER_HOURS * 60 * 60 * 1_000,
    },
  };
}

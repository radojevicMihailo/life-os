import "server-only";
import { randomUUID } from "node:crypto";
import { AlphaVantageClient } from "../adapters/alpha-vantage/client";
import { CoinGeckoClient } from "../adapters/coingecko/client";
import { NbsClient } from "../adapters/nbs/client";
import { env } from "../config/env";
import { unitOfWork } from "../db/unit-of-work";
import { pool } from "@/db/pool";
import { reserveAlphaVantageRequest } from "../db/alpha-vantage-budget";
import { refreshDailyValuations, type MarketQuoteProvider } from "./valuation";
import type { ApplicationDependencies } from "./ports";
import { serializeValuationRefresh, type RefreshScope } from "./refresh-scheduler";

export function refreshProductionValuations(scope: RefreshScope | "all" = "all") {
  return serializeValuationRefresh(() => performRefresh(scope));
}

async function performRefresh(scope: RefreshScope | "all") {
  const application: ApplicationDependencies = {
    unitOfWork,
    ids: { nextId: (kind) => `${kind}-${randomUUID()}` },
    clock: { now: () => new Date() },
  };
  const marketQuoteProviders: MarketQuoteProvider[] = [];
  // Create a fresh timeout when each provider actually makes its HTTP request.
  if (scope !== "crypto" && env.ALPHA_VANTAGE_API_KEY) {
    marketQuoteProviders.push(new AlphaVantageClient({
      apiKey: env.ALPHA_VANTAGE_API_KEY, clock: application.clock, fetch,
      reserveRequest: () => reserveAlphaVantageRequest(pool),
      get signal() { return AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS); },
    }));
  }
  if (scope !== "fx" && env.COINGECKO_API_KEY) {
    marketQuoteProviders.push(new CoinGeckoClient({
      apiKey: env.COINGECKO_API_KEY, clock: application.clock, fetch,
      get signal() { return AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS); },
    }));
  }
  return refreshDailyValuations(application, {
    fxRateProvider: scope === "crypto" ? undefined : new NbsClient({
      clock: application.clock, fetch,
      get signal() { return AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS); },
    }),
    marketQuoteProviders,
  });
}

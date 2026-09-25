import { randomUUID } from "node:crypto";

import { AlphaVantageClient } from "@/modules/finance/adapters/alpha-vantage/client";
import { CoinGeckoClient } from "@/modules/finance/adapters/coingecko/client";
import { NbsClient } from "@/modules/finance/adapters/nbs/client";
import {
  refreshDailyValuations,
  type MarketQuoteProvider,
} from "@/modules/finance/application/valuation";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { createDailyRefreshHandler } from "@/modules/finance/ui/cron-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let productionHandler: ReturnType<typeof createDailyRefreshHandler> | undefined;

async function getProductionHandler() {
  if (!productionHandler) {
    const [{ env }, { unitOfWork }] = await Promise.all([
      import("@/modules/finance/config/env"),
      import("@/modules/finance/db/unit-of-work"),
    ]);
    const application: ApplicationDependencies = {
      unitOfWork,
      ids: { nextId: (kind) => `${kind}-${randomUUID()}` },
      clock: { now: () => new Date() },
    };
    productionHandler = createDailyRefreshHandler({
      cronSecret: env.CRON_SECRET,
      refresh: async () => {
        const marketQuoteProviders: MarketQuoteProvider[] = [];
        if (env.ALPHA_VANTAGE_API_KEY) {
          marketQuoteProviders.push(new AlphaVantageClient({
            apiKey: env.ALPHA_VANTAGE_API_KEY,
            clock: application.clock,
            fetch,
            signal: AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS),
          }));
        }
        if (env.COINGECKO_API_KEY) {
          marketQuoteProviders.push(new CoinGeckoClient({
            apiKey: env.COINGECKO_API_KEY,
            clock: application.clock,
            fetch,
            signal: AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS),
          }));
        }
        return refreshDailyValuations(application, {
          fxRateProvider: new NbsClient({
            clock: application.clock,
            fetch,
            signal: AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS),
          }),
          marketQuoteProviders,
        });
      },
    });
  }
  return productionHandler;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ error: "integration_not_configured" }, { status: 503 });
  return (await getProductionHandler())(request);
}

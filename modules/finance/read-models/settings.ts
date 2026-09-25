import { desc, eq, isNull } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import {
  currencies,
  manualValuationOverrides,
  providerRefreshRuns,
} from "../db/schema";

export async function getSettingsStatus(
  dependencies: ApplicationDependencies,
) {
  return dependencies.unitOfWork.run(async (tx) => {
    const activeCurrencies = await tx
      .select({ code: currencies.code, name: currencies.name })
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .orderBy(currencies.code);
    const providerRuns = await tx
      .selectDistinctOn([providerRefreshRuns.provider], {
        attemptedCount: providerRefreshRuns.attemptedCount,
        error: providerRefreshRuns.error,
        failedCount: providerRefreshRuns.failedCount,
        finishedAt: providerRefreshRuns.finishedAt,
        provider: providerRefreshRuns.provider,
        startedAt: providerRefreshRuns.startedAt,
        status: providerRefreshRuns.status,
        succeededCount: providerRefreshRuns.succeededCount,
      })
      .from(providerRefreshRuns)
      .orderBy(
        providerRefreshRuns.provider,
        desc(providerRefreshRuns.startedAt),
        desc(providerRefreshRuns.id),
      );
    const overrides = await tx
      .select({
        baseCurrencyCode: manualValuationOverrides.baseCurrencyCode,
        effectiveAt: manualValuationOverrides.effectiveAt,
        instrumentId: manualValuationOverrides.instrumentId,
        kind: manualValuationOverrides.kind,
        quoteCurrencyCode: manualValuationOverrides.quoteCurrencyCode,
        value: manualValuationOverrides.value,
      })
      .from(manualValuationOverrides)
      .where(isNull(manualValuationOverrides.clearedAt))
      .orderBy(desc(manualValuationOverrides.effectiveAt));

    return {
      activeCurrencies,
      overrides,
      providerRuns,
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

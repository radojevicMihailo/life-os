import { getPositionPerformanceInTransaction } from "./investments";
import type { ApplicationDependencies } from "./ports";
import { Rate } from "../domain/money";
import {
  calculateNetWorthEur,
  selectEffectiveValue,
  type EffectiveValuation,
} from "../domain/valuation";
import {
  type ManualOverrideTarget,
  ValuationRepository,
} from "../db/repositories/valuation";

export interface FxRateObservation {
  baseCurrencyCode: string;
  quoteCurrencyCode: "EUR";
  rate: string;
  provider: string;
  providerTimestamp: Date;
  retrievedAt: Date;
  rawPayload?: unknown;
}

export interface MarketQuoteRequest {
  instrumentId: string;
  providerId: string;
  quoteCurrencyCode: string;
}

export interface MarketQuoteObservation extends MarketQuoteRequest {
  price: string;
  provider: string;
  providerTimestamp: Date;
  retrievedAt: Date;
  rawPayload?: unknown;
}

export interface MarketQuoteResolutionRequest {
  instrumentId: string;
  symbol: string;
  quoteCurrencyCode: string;
  isin: string | null;
  exchange: string | null;
}

export interface MarketQuoteResolution {
  providerId: string;
  currencyCode: string;
}

export interface MarketQuoteRequestBudget {
  remaining: number;
}

export interface FxRateProvider {
  readonly provider: string;
  fetchRates(baseCurrencyCodes: string[]): Promise<FxRateObservation[]>;
}

export interface MarketQuoteProvider {
  readonly provider: string;
  readonly maxRequestsPerRefresh?: number;
  resolveSymbol?(
    request: MarketQuoteResolutionRequest,
    budget?: MarketQuoteRequestBudget,
  ): Promise<MarketQuoteResolution>;
  fetchQuotes(
    requests: MarketQuoteRequest[],
    budget?: MarketQuoteRequestBudget,
  ): Promise<{
    quotes: MarketQuoteObservation[];
    skippedProviderIds: string[];
    failures?: Array<{ providerId: string; error: string }>;
  }>;
}

export type ManualOverrideInput = ManualOverrideTarget & {
  value: string;
  effectiveAt?: Date;
};

function normalizedCurrency(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new Error("currency_invalid");
  return normalized;
}

function normalizeTarget<T extends ManualOverrideTarget>(target: T): T {
  return target.kind === "exchange_rate"
    ? { ...target, baseCurrencyCode: normalizedCurrency(target.baseCurrencyCode), quoteCurrencyCode: normalizedCurrency(target.quoteCurrencyCode) }
    : { ...target, instrumentId: target.instrumentId.trim(), quoteCurrencyCode: normalizedCurrency(target.quoteCurrencyCode) };
}

export async function setManualOverride(
  deps: ApplicationDependencies,
  input: ManualOverrideInput,
) {
  const target = normalizeTarget(input);
  const now = deps.clock.now();
  return deps.unitOfWork.run((tx) => new ValuationRepository(tx).setManualOverride({
    ...target,
    id: deps.ids.nextId("manualOverride"),
    value: Rate.parse(input.value).value,
    effectiveAt: input.effectiveAt ?? now,
    createdAt: now,
  }));
}

export async function clearManualOverride(
  deps: ApplicationDependencies,
  input: ManualOverrideTarget,
) {
  const target = normalizeTarget(input);
  return deps.unitOfWork.run((tx) =>
    new ValuationRepository(tx).clearManualOverride(target, deps.clock.now()));
}

function rateSelection(
  rows: Awaited<ReturnType<ValuationRepository["latestRate"]>>,
  now: Date,
  staleAfterMs: number,
) {
  return selectEffectiveValue({
    automatic: rows.automatic ? {
      value: rows.automatic.rate.replace(/\.?0+$/, ""),
      source: rows.automatic.provider,
      effectiveAt: rows.automatic.providerTimestamp,
      retrievedAt: rows.automatic.retrievedAt,
    } : undefined,
    manual: rows.manual ? {
      value: rows.manual.value.replace(/\.?0+$/, ""),
      source: "manual",
      effectiveAt: rows.manual.effectiveAt,
      retrievedAt: rows.manual.createdAt,
    } : undefined,
    now,
    staleAfterMs,
  });
}

function quoteSelection(
  rows: Awaited<ReturnType<ValuationRepository["latestQuote"]>>,
  now: Date,
  staleAfterMs: number,
) {
  const selected = selectEffectiveValue({
    automatic: rows.automatic ? {
      value: rows.automatic.price.replace(/\.?0+$/, ""),
      source: rows.automatic.provider,
      effectiveAt: rows.automatic.providerTimestamp,
      retrievedAt: rows.automatic.retrievedAt,
    } : undefined,
    manual: rows.manual ? {
      value: rows.manual.value.replace(/\.?0+$/, ""),
      source: "manual",
      effectiveAt: rows.manual.effectiveAt,
      retrievedAt: rows.manual.createdAt,
    } : undefined,
    now,
    staleAfterMs,
  });
  return selected && !selected.manual && rows.automatic?.status === "stale"
    ? { ...selected, stale: true }
    : selected;
}

function identity(now: Date): EffectiveValuation {
  return {
    value: "1",
    source: "identity",
    effectiveAt: now,
    retrievedAt: now,
    ageMs: 0,
    manual: false,
    stale: false,
  };
}

export async function valueNetWorthEur(
  deps: ApplicationDependencies,
  options: {
    exchangeRateStaleAfterMs: number;
    marketDataStaleAfterMs: number;
  },
) {
  const now = deps.clock.now();
  return deps.unitOfWork.run(async (tx) => {
    const repository = new ValuationRepository(tx);
    const accounts = await repository.listNetWorthAccounts();
    const positions = await repository.listOpenPositions();
    const currencies = new Set([
      ...accounts.map((account) => account.currencyCode),
      ...positions.map((position) => position.quoteCurrencyCode),
    ]);
    const rates = new Map<string, EffectiveValuation>();
    for (const currencyCode of currencies) {
      if (currencyCode === "EUR") continue;
      const selected = rateSelection(
        await repository.latestRate(currencyCode), now, options.exchangeRateStaleAfterMs,
      );
      if (selected) rates.set(currencyCode, selected);
    }
    const quotes = new Map<string, EffectiveValuation>();
    for (const position of positions) {
      const selected = quoteSelection(
        await repository.latestQuote(position.instrumentId, position.quoteCurrencyCode),
        now,
        options.marketDataStaleAfterMs,
      );
      if (selected) quotes.set(position.instrumentId, selected);
    }
    const snapshot = { accounts, positions, quotes, rates };

  const investments = [];
  const missingQuotes: string[] = [];
  const missingConversions = new Set<string>();
  for (const position of snapshot.positions) {
    const quote = snapshot.quotes.get(position.instrumentId);
    const fx = position.quoteCurrencyCode === "EUR"
      ? identity(now)
      : snapshot.rates.get(position.quoteCurrencyCode);
    if (!quote) {
      missingQuotes.push(position.instrumentId);
      continue;
    }
    if (!fx) {
      missingConversions.add(position.quoteCurrencyCode);
      continue;
    }

    const performance = await getPositionPerformanceInTransaction(tx, {
      investmentAccountId: position.investmentAccountId,
      instrumentId: position.instrumentId,
      valuation: {
        quote: {
          price: quote.value,
          currencyCode: position.quoteCurrencyCode,
          source: {
            kind: quote.manual ? "manual" : "automatic",
            provider: quote.source,
            effectiveAt: quote.effectiveAt,
            retrievedAt: quote.retrievedAt,
          },
        },
        reportingFx: {
          rate: fx.value,
          baseCurrencyCode: position.quoteCurrencyCode,
          quoteCurrencyCode: "EUR",
          source: {
            kind: fx.manual ? "manual" : "automatic",
            provider: fx.source,
            effectiveAt: fx.effectiveAt,
            retrievedAt: fx.retrievedAt,
          },
        },
      },
    }, { lock: false });
    investments.push({
      instrumentId: position.instrumentId,
      investmentAccountId: position.investmentAccountId,
      quantity: performance.quantity,
      nativeAmount: performance.marketValue.amount,
      nativeCurrencyCode: performance.marketValue.currencyCode,
      eurAmount: performance.marketValue.reportingAmount,
      openCostBasis: performance.openCostBasis,
      realizedReturn: performance.realizedReturn,
      unrealizedReturn: performance.unrealizedReturn,
      quote,
      reportingFx: fx,
    });
  }

  const ratesToEur = new Map([...snapshot.rates].map(([currencyCode, rate]) => [
    currencyCode,
    { value: rate.value, source: rate.source, effectiveAt: rate.effectiveAt },
  ]));
  const calculated = calculateNetWorthEur({
    accounts: snapshot.accounts,
    investments: investments.map(({ instrumentId, eurAmount }) => ({ instrumentId, eurAmount })),
    ratesToEur,
  });
  for (const currency of calculated.missingConversions) missingConversions.add(currency);
  const incomplete = missingQuotes.length > 0 || missingConversions.size > 0;

  return {
    ...calculated,
    accounts: calculated.accounts.map((account) => ({
      ...account,
      valuation: account.currencyCode === "EUR" ? identity(now) : snapshot.rates.get(account.currencyCode) ?? null,
    })),
    investments,
    missingConversions: [...missingConversions].sort(),
    missingQuotes: missingQuotes.sort(),
    stale: [...snapshot.rates.values(), ...snapshot.quotes.values()].some((value) => value.stale),
    totalEur: incomplete ? null : calculated.totalEur,
  };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

async function createRun(
  deps: ApplicationDependencies,
  provider: string,
  attemptedCount: number,
) {
  const id = deps.ids.nextId("providerRefreshRun");
  await deps.unitOfWork.run((tx) => new ValuationRepository(tx).startRefreshRun({
    id, provider, attemptedCount, startedAt: deps.clock.now(),
  }));
  return id;
}

async function finishRun(
  deps: ApplicationDependencies,
  input: {
    id: string;
    succeededCount: number;
    failedCount: number;
    errors: string[];
  },
) {
  const status = input.failedCount === 0
    ? "valid" as const
    : input.succeededCount === 0
      ? "failed" as const
      : "stale" as const;
  await deps.unitOfWork.run((tx) => new ValuationRepository(tx).finishRefreshRun({
    id: input.id,
    finishedAt: deps.clock.now(),
    status,
    succeededCount: input.succeededCount,
    failedCount: input.failedCount,
    error: input.errors.length > 0 ? input.errors.join("; ") : undefined,
  }));
}

export async function refreshDailyValuations(
  deps: ApplicationDependencies,
  providers: {
    fxRateProvider: FxRateProvider;
    marketQuoteProviders: MarketQuoteProvider[];
  },
) {
  const targets = await deps.unitOfWork.run(async (tx) => {
    const repository = new ValuationRepository(tx);
    return {
      currencies: await repository.listFxTargetCurrencies(),
      quotes: await repository.listMarketQuoteTargets(),
    };
  });
  let succeededCount = 0;
  let failedCount = 0;
  const runs = [];

  const fxRunId = await createRun(deps, providers.fxRateProvider.provider, targets.currencies.length);
  const fxErrors: string[] = [];
  let fxRunSucceeded = 0;
  let fxRunFailed = 0;
  try {
    const rates = await providers.fxRateProvider.fetchRates(targets.currencies);
    const byCurrency = new Map(rates.map((rate) => [rate.baseCurrencyCode, rate]));
    for (const currencyCode of targets.currencies) {
      const rate = byCurrency.get(currencyCode);
      if (!rate) {
        fxRunFailed += 1;
        fxErrors.push(`${currencyCode}:missing`);
        continue;
      }
      try {
        const normalized = { ...rate, rate: Rate.parse(rate.rate).value };
        await deps.unitOfWork.run((tx) => new ValuationRepository(tx).insertExchangeRate(
          deps.ids.nextId("exchangeRate"), normalized,
        ));
        fxRunSucceeded += 1;
      } catch (error) {
        fxRunFailed += 1;
        fxErrors.push(`${currencyCode}:${error instanceof Error ? error.message : "invalid"}`);
      }
    }
  } catch (error) {
    fxRunFailed = targets.currencies.length || 1;
    fxErrors.push(error instanceof Error ? error.message : "provider_error");
  }
  succeededCount += fxRunSucceeded;
  failedCount += fxRunFailed;
  await finishRun(deps, {
    id: fxRunId,
    succeededCount: fxRunSucceeded,
    failedCount: fxRunFailed,
    errors: fxErrors,
  });
  runs.push(fxRunId);

  for (const provider of providers.marketQuoteProviders) {
    const providerTargets = targets.quotes
      .filter((target) => target.provider === provider.provider);
    const runId = await createRun(deps, provider.provider, providerTargets.length);
    const requestBudget = provider.maxRequestsPerRefresh === undefined
      ? undefined
      : { remaining: provider.maxRequestsPerRefresh };
    const requests: MarketQuoteRequest[] = [];
    const errors: string[] = [];
    const failedInstrumentIds = new Set<string>();
    for (const target of providerTargets) {
      if (target.providerId) {
        requests.push({
          instrumentId: target.instrumentId,
          providerId: target.providerId,
          quoteCurrencyCode: target.quoteCurrencyCode,
        });
        continue;
      }
      if (!provider.resolveSymbol) {
        continue;
      }
      try {
        const resolved = await provider.resolveSymbol({
          instrumentId: target.instrumentId,
          symbol: target.symbol,
          quoteCurrencyCode: target.quoteCurrencyCode,
          isin: target.isin,
          exchange: target.exchange,
        }, requestBudget);
        const providerId = resolved.providerId.trim();
        if (!providerId) throw new Error("provider_id_invalid");
        if (resolved.currencyCode.toUpperCase() !== target.quoteCurrencyCode) {
          throw new Error("quote_currency_mismatch");
        }
        await deps.unitOfWork.run((tx) =>
          new ValuationRepository(tx).setInstrumentProviderId({
            instrumentId: target.instrumentId,
            provider: provider.provider,
            providerId,
          }));
        requests.push({
          instrumentId: target.instrumentId,
          providerId,
          quoteCurrencyCode: target.quoteCurrencyCode,
        });
      } catch (error) {
        failedInstrumentIds.add(target.instrumentId);
        const message = error instanceof Error ? error.message : "resolution_failed";
        errors.push(`${target.instrumentId}:${message}`);
        if (message === "provider_request_budget_exhausted") {
          await deps.unitOfWork.run((tx) =>
            new ValuationRepository(tx).markLatestQuoteStale(
              target.instrumentId,
              target.quoteCurrencyCode,
            ));
        }
      }
    }
    let runSucceeded = 0;
    const failedProviderIds = new Set<string>();
    try {
      const result = await provider.fetchQuotes(requests, requestBudget);
      errors.push(...result.skippedProviderIds.map((id) => `${id}:free_allowance`));
      errors.push(...(result.failures ?? []).map((failure) => `${failure.providerId}:${failure.error}`));
      result.skippedProviderIds.forEach((id) => failedProviderIds.add(id));
      (result.failures ?? []).forEach((failure) => failedProviderIds.add(failure.providerId));
      for (const providerId of result.skippedProviderIds) {
        const request = requests.find((candidate) => candidate.providerId === providerId);
        if (request) {
          await deps.unitOfWork.run((tx) => new ValuationRepository(tx).markLatestQuoteStale(
            request.instrumentId,
            request.quoteCurrencyCode,
          ));
        }
      }
      const returnedProviderIds = new Set(result.quotes.map((quote) => quote.providerId));
      for (const quote of result.quotes) {
        try {
          const normalized = { ...quote, price: Rate.parse(quote.price).value };
          await deps.unitOfWork.run((tx) => new ValuationRepository(tx).insertMarketQuote(
            deps.ids.nextId("marketQuote"), normalized,
          ));
          runSucceeded += 1;
        } catch (error) {
          failedProviderIds.add(quote.providerId);
          errors.push(`${quote.providerId}:${error instanceof Error ? error.message : "invalid"}`);
        }
      }
      for (const request of requests) {
        if (!returnedProviderIds.has(request.providerId) && !failedProviderIds.has(request.providerId)) {
          failedProviderIds.add(request.providerId);
          errors.push(`${request.providerId}:missing`);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "provider_error");
      requests.forEach((request) => failedProviderIds.add(request.providerId));
    }
    const runFailed = failedProviderIds.size + failedInstrumentIds.size ||
      (errors.length > 0 && providerTargets.length === 0 ? 1 : 0);
    succeededCount += runSucceeded;
    failedCount += runFailed;
    await finishRun(deps, {
      id: runId,
      succeededCount: runSucceeded,
      failedCount: runFailed,
      errors,
    });
    runs.push(runId);
  }

  return { succeededCount, failedCount, runIds: runs };
}

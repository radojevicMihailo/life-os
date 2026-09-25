import Decimal from "decimal.js";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";

import type {
  FxRateObservation,
  MarketQuoteObservation,
} from "../../application/valuation";
import type { DbTx } from "../client";
import {
  accounts,
  exchangeRates,
  instruments,
  investmentTransactions,
  journalPostings,
  journalTransactions,
  manualValuationOverrides,
  marketQuotes,
  providerRefreshRuns,
} from "../schema";

const ExactDecimal = Decimal.clone({ precision: 80 });

export type ManualOverrideTarget =
  | {
      kind: "exchange_rate";
      baseCurrencyCode: string;
      quoteCurrencyCode: string;
    }
  | {
      kind: "market_quote";
      instrumentId: string;
      quoteCurrencyCode: string;
    };

function targetCondition(target: ManualOverrideTarget) {
  return target.kind === "exchange_rate"
    ? and(
        eq(manualValuationOverrides.kind, target.kind),
        eq(manualValuationOverrides.baseCurrencyCode, target.baseCurrencyCode),
        eq(manualValuationOverrides.quoteCurrencyCode, target.quoteCurrencyCode),
        isNull(manualValuationOverrides.instrumentId),
      )
    : and(
        eq(manualValuationOverrides.kind, target.kind),
        eq(manualValuationOverrides.instrumentId, target.instrumentId),
        eq(manualValuationOverrides.quoteCurrencyCode, target.quoteCurrencyCode),
        isNull(manualValuationOverrides.baseCurrencyCode),
      );
}

function targetKey(target: ManualOverrideTarget) {
  return target.kind === "exchange_rate"
    ? `${target.kind}:${target.baseCurrencyCode}:${target.quoteCurrencyCode}`
    : `${target.kind}:${target.instrumentId}:${target.quoteCurrencyCode}`;
}

export class ValuationRepository {
  constructor(private readonly tx: DbTx) {}

  async insertExchangeRate(id: string, value: FxRateObservation) {
    await this.tx.insert(exchangeRates).values({
      id,
      baseCurrencyCode: value.baseCurrencyCode,
      quoteCurrencyCode: value.quoteCurrencyCode,
      rate: value.rate,
      provider: value.provider,
      providerTimestamp: value.providerTimestamp,
      retrievedAt: value.retrievedAt,
      status: "valid",
      rawPayload: value.rawPayload ?? null,
    });
  }

  async insertMarketQuote(id: string, value: MarketQuoteObservation) {
    await this.tx.insert(marketQuotes).values({
      id,
      instrumentId: value.instrumentId,
      quoteCurrencyCode: value.quoteCurrencyCode,
      price: value.price,
      provider: value.provider,
      providerTimestamp: value.providerTimestamp,
      retrievedAt: value.retrievedAt,
      status: "valid",
      rawPayload: value.rawPayload ?? null,
    });
  }

  async setManualOverride(input: ManualOverrideTarget & {
    id: string;
    value: string;
    effectiveAt: Date;
    createdAt: Date;
  }) {
    await this.tx.execute(sql`select pg_advisory_xact_lock(hashtext(${targetKey(input)}))`);
    await this.tx
      .update(manualValuationOverrides)
      .set({ clearedAt: input.createdAt })
      .where(and(targetCondition(input), isNull(manualValuationOverrides.clearedAt)));
    const [stored] = await this.tx.insert(manualValuationOverrides).values({
      id: input.id,
      kind: input.kind,
      baseCurrencyCode: input.kind === "exchange_rate" ? input.baseCurrencyCode : null,
      quoteCurrencyCode: input.quoteCurrencyCode,
      instrumentId: input.kind === "market_quote" ? input.instrumentId : null,
      value: input.value,
      effectiveAt: input.effectiveAt,
      createdAt: input.createdAt,
      clearedAt: null,
    }).returning();
    return stored;
  }

  async clearManualOverride(target: ManualOverrideTarget, clearedAt: Date) {
    await this.tx.execute(sql`select pg_advisory_xact_lock(hashtext(${targetKey(target)}))`);
    return this.tx
      .update(manualValuationOverrides)
      .set({ clearedAt })
      .where(and(targetCondition(target), isNull(manualValuationOverrides.clearedAt)))
      .returning();
  }

  async latestRate(baseCurrencyCode: string, quoteCurrencyCode = "EUR") {
    const [automatic] = await this.tx.select().from(exchangeRates).where(and(
      eq(exchangeRates.baseCurrencyCode, baseCurrencyCode),
      eq(exchangeRates.quoteCurrencyCode, quoteCurrencyCode),
      eq(exchangeRates.status, "valid"),
    )).orderBy(desc(exchangeRates.providerTimestamp), desc(exchangeRates.retrievedAt), desc(exchangeRates.id)).limit(1);
    const [manual] = await this.tx.select().from(manualValuationOverrides).where(and(
      targetCondition({ kind: "exchange_rate", baseCurrencyCode, quoteCurrencyCode }),
      isNull(manualValuationOverrides.clearedAt),
    )).orderBy(desc(manualValuationOverrides.effectiveAt), desc(manualValuationOverrides.id)).limit(1);
    return { automatic, manual };
  }

  async latestQuote(instrumentId: string, quoteCurrencyCode: string) {
    const [automatic] = await this.tx.select().from(marketQuotes).where(and(
      eq(marketQuotes.instrumentId, instrumentId),
      eq(marketQuotes.quoteCurrencyCode, quoteCurrencyCode),
      inArray(marketQuotes.status, ["valid", "stale"]),
    )).orderBy(desc(marketQuotes.providerTimestamp), desc(marketQuotes.retrievedAt), desc(marketQuotes.id)).limit(1);
    const [manual] = await this.tx.select().from(manualValuationOverrides).where(and(
      targetCondition({ kind: "market_quote", instrumentId, quoteCurrencyCode }),
      isNull(manualValuationOverrides.clearedAt),
    )).orderBy(desc(manualValuationOverrides.effectiveAt), desc(manualValuationOverrides.id)).limit(1);
    return { automatic, manual };
  }

  async markLatestQuoteStale(instrumentId: string, quoteCurrencyCode: string) {
    const [latest] = await this.tx.select({ id: marketQuotes.id }).from(marketQuotes).where(and(
      eq(marketQuotes.instrumentId, instrumentId),
      eq(marketQuotes.quoteCurrencyCode, quoteCurrencyCode),
      inArray(marketQuotes.status, ["valid", "stale"]),
    )).orderBy(desc(marketQuotes.providerTimestamp), desc(marketQuotes.retrievedAt), desc(marketQuotes.id)).limit(1);
    if (latest) {
      await this.tx.update(marketQuotes).set({ status: "stale" }).where(eq(marketQuotes.id, latest.id));
    }
  }

  async listNetWorthAccounts() {
    const balance = sql<string>`coalesce(sum(case when ${journalTransactions.status} = 'posted' then ${journalPostings.amount} else 0 end), 0)`;
    const rows = await this.tx.select({
      accountId: accounts.id,
      classification: accounts.classification,
      currencyCode: accounts.currencyCode,
      balance,
    }).from(accounts)
      .leftJoin(journalPostings, eq(journalPostings.accountId, accounts.id))
      .leftJoin(journalTransactions, and(
        eq(journalTransactions.id, journalPostings.transactionId),
        eq(journalTransactions.status, "posted"),
      ))
      .where(inArray(accounts.classification, ["asset", "liability", "receivable"]))
      .groupBy(accounts.id, accounts.classification, accounts.currencyCode);

    return rows.map((row) => ({
      accountId: row.accountId,
      classification: row.classification as "asset" | "liability" | "receivable",
      currencyCode: row.currencyCode,
      nativeAmount: row.classification === "liability"
        ? new ExactDecimal(row.balance).negated().toString()
        : new ExactDecimal(row.balance).toString(),
    }));
  }

  async listFxTargetCurrencies() {
    const accountRows = await this.tx.selectDistinct({ code: accounts.currencyCode })
      .from(accounts)
      .where(inArray(accounts.classification, ["asset", "liability", "receivable"]));
    const instrumentRows = await this.tx.selectDistinct({ code: instruments.quoteCurrencyCode })
      .from(instruments)
      .where(eq(instruments.isActive, true));
    return [...new Set([...accountRows, ...instrumentRows].map((row) => row.code))]
      .filter((code) => code !== "EUR")
      .sort();
  }

  async listMarketQuoteTargets() {
    return this.tx.select({
      instrumentId: instruments.id,
      symbol: instruments.symbol,
      provider: instruments.provider,
      providerId: instruments.providerId,
      quoteCurrencyCode: instruments.quoteCurrencyCode,
      isin: instruments.isin,
      exchange: instruments.exchange,
    }).from(instruments).where(and(
      eq(instruments.isActive, true),
      eq(instruments.valuationMethod, "market_quote"),
      isNotNull(instruments.provider),
    )).orderBy(asc(instruments.id));
  }

  async setInstrumentProviderId(input: {
    instrumentId: string;
    provider: string;
    providerId: string;
  }) {
    const [stored] = await this.tx.update(instruments).set({
      providerId: input.providerId,
      updatedAt: new Date(),
    }).where(and(
      eq(instruments.id, input.instrumentId),
      eq(instruments.provider, input.provider),
      isNull(instruments.providerId),
    )).returning({ providerId: instruments.providerId });
    if (!stored) throw new Error("instrument_provider_resolution_conflict");
    return stored;
  }

  async listOpenPositions() {
    const quantity = sql<string>`sum(case when ${investmentTransactions.type} = 'buy' then ${investmentTransactions.quantity} when ${investmentTransactions.type} = 'sell' then -${investmentTransactions.quantity} else 0 end)`;
    return this.tx.select({
      investmentAccountId: investmentTransactions.investmentAccountId,
      instrumentId: investmentTransactions.instrumentId,
      quoteCurrencyCode: instruments.quoteCurrencyCode,
      quantity,
    }).from(investmentTransactions)
      .innerJoin(instruments, eq(instruments.id, investmentTransactions.instrumentId))
      .where(eq(investmentTransactions.status, "posted"))
      .groupBy(
        investmentTransactions.investmentAccountId,
        investmentTransactions.instrumentId,
        instruments.quoteCurrencyCode,
      ).having(sql`${quantity} > 0`);
  }

  async startRefreshRun(input: { id: string; provider: string; startedAt: Date; attemptedCount: number }) {
    await this.tx.insert(providerRefreshRuns).values({
      ...input,
      status: "stale",
      succeededCount: 0,
      failedCount: 0,
    });
  }

  async finishRefreshRun(input: {
    id: string;
    finishedAt: Date;
    status: "valid" | "stale" | "failed";
    succeededCount: number;
    failedCount: number;
    error?: string;
  }) {
    await this.tx.update(providerRefreshRuns).set({
      finishedAt: input.finishedAt,
      status: input.status,
      succeededCount: input.succeededCount,
      failedCount: input.failedCount,
      error: input.error ?? null,
    }).where(eq(providerRefreshRuns.id, input.id));
  }
}

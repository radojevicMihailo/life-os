import { and, eq, lte, inArray } from "drizzle-orm";
import type { DbTx } from "../client";
import { accounts, exchangeRates, marketQuotes, manualValuationOverrides, journalTransactions, journalPostings, instruments, investmentTransactions, currencies } from "../schema";
import { selectEffectiveValue, type EffectiveValuation } from "../../domain/valuation";
export interface HistoricalValuationOptions {
    exchangeRateStaleAfterMs: number;
    marketDataStaleAfterMs: number;
}
export class HistoryRepository {
    constructor(private readonly tx: DbTx) { }
    async load(asOf: Date) {
        const [postingRows, trades, quotes, rates, overrides, currencyRows, instrumentRows] = [
await this.tx.select({ account: accounts, amount: journalPostings.amount, currencyCode: journalPostings.currencyCode, categoryId: journalPostings.categoryId, type: journalTransactions.type, occurredAt: journalTransactions.occurredAt, id: journalTransactions.id, correctionOfId: journalTransactions.correctionOfId }).from(journalPostings).innerJoin(accounts, eq(accounts.id, journalPostings.accountId)).innerJoin(journalTransactions, eq(journalTransactions.id, journalPostings.transactionId)).where(and(eq(journalTransactions.status, "posted"), lte(journalTransactions.occurredAt, asOf))),
await this.tx.select().from(investmentTransactions).where(lte(investmentTransactions.occurredAt, asOf)),
await this.tx.select().from(marketQuotes).where(and(inArray(marketQuotes.status, ["valid", "stale"]), lte(marketQuotes.providerTimestamp, asOf))).orderBy(marketQuotes.providerTimestamp, marketQuotes.retrievedAt, marketQuotes.id),
await this.tx.select().from(exchangeRates).where(and(eq(exchangeRates.status, "valid"), lte(exchangeRates.providerTimestamp, asOf))).orderBy(exchangeRates.providerTimestamp, exchangeRates.retrievedAt, exchangeRates.id),
await this.tx.select().from(manualValuationOverrides).where(lte(manualValuationOverrides.effectiveAt, asOf)).orderBy(manualValuationOverrides.effectiveAt, manualValuationOverrides.createdAt, manualValuationOverrides.id),
await this.tx.select().from(currencies),
await this.tx.select().from(instruments)
];
        return { postingRows, trades, quotes, rates, overrides, currencies: currencyRows, instruments: instrumentRows };
    }
}
export type HistoricalData = Awaited<ReturnType<HistoryRepository["load"]>>;
export function historicalRate(data: HistoricalData, currency: string, at: Date, options: HistoricalValuationOptions): EffectiveValuation | null {
    if (currency === "EUR")
        return { value: "1", source: "identity", effectiveAt: at, ageMs: 0, manual: false, stale: false };
    const automatic = data.rates.filter(r => r.baseCurrencyCode === currency && r.quoteCurrencyCode === "EUR" && r.providerTimestamp <= at).at(-1);
    const manual = data.overrides.filter(r => r.kind === "exchange_rate" && r.baseCurrencyCode === currency && r.quoteCurrencyCode === "EUR" && r.effectiveAt <= at && (!r.clearedAt || r.clearedAt > at)).at(-1);
    const cryptoIds = new Set(data.instruments.filter(i => i.class === "crypto" && i.symbol === currency && ["BTC", "ETH"].includes(currency)).map(i => i.id));
    const cryptoQuote = !automatic ? data.quotes.filter(q => cryptoIds.has(q.instrumentId) && q.quoteCurrencyCode === "EUR" && q.providerTimestamp <= at).at(-1) : undefined;
    const cryptoManual = !manual ? data.overrides.filter(q => q.instrumentId && cryptoIds.has(q.instrumentId) && q.kind === "market_quote" && q.quoteCurrencyCode === "EUR" && q.effectiveAt <= at && (!q.clearedAt || q.clearedAt > at)).at(-1) : undefined;
    return selectEffectiveValue({ now: at, staleAfterMs: cryptoQuote ? options.marketDataStaleAfterMs : options.exchangeRateStaleAfterMs,
        automatic: automatic ? { value: automatic.rate, source: automatic.provider, effectiveAt: automatic.providerTimestamp, retrievedAt: automatic.retrievedAt } : cryptoQuote ? { value: cryptoQuote.price, source: cryptoQuote.provider, effectiveAt: cryptoQuote.providerTimestamp, retrievedAt: cryptoQuote.retrievedAt } : undefined,
        manual: manual ? { value: manual.value, source: "manual", effectiveAt: manual.effectiveAt, retrievedAt: manual.createdAt } : cryptoManual ? { value: cryptoManual.value, source: "manual", effectiveAt: cryptoManual.effectiveAt, retrievedAt: cryptoManual.createdAt } : undefined });
}
export function historicalQuote(data: HistoricalData, instrumentId: string, at: Date, options: HistoricalValuationOptions): EffectiveValuation | null {
    const automatic = data.quotes.filter(r => r.instrumentId === instrumentId && r.providerTimestamp <= at).at(-1);
    const manual = data.overrides.filter(r => r.kind === "market_quote" && r.instrumentId === instrumentId && r.effectiveAt <= at && (!r.clearedAt || r.clearedAt > at)).at(-1);
    return selectEffectiveValue({ now: at, staleAfterMs: options.marketDataStaleAfterMs, automatic: automatic ? { value: automatic.price, source: automatic.provider, effectiveAt: automatic.providerTimestamp, retrievedAt: automatic.retrievedAt } : undefined, manual: manual ? { value: manual.value, source: "manual", effectiveAt: manual.effectiveAt, retrievedAt: manual.createdAt } : undefined });
}

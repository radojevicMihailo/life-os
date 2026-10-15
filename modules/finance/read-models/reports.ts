import Decimal from "decimal.js";
import type { ApplicationDependencies } from "../application/ports";
import { HistoryRepository, historicalRate, historicalQuote, type HistoricalData, type HistoricalValuationOptions } from "../db/repositories/history";
import { belgradeMidnight, calendarDate, todayBelgrade, addDays, monthEnd } from "../domain/calendar";
import { calculateSavingsRate } from "../domain/reporting";
const D = Decimal.clone({ precision: 80 });
export interface HistoricalPoint {
    month: string;
    cutoff: Date;
    netWorthEur: string | null;
    incomeEur: string | null;
    expenseEur: string | null;
    netEur: string | null;
    savingsRate: string | null;
    investmentBuysEur: string | null;
    investmentSalesEur: string | null;
    marketEffectEur: string | null;
    fxEffectEur: string | null;
    adjustmentsEur: string | null;
    netWorthChangeEur: string | null;
    unattributedEur: string | null;
    missingSources: string[];
    stale: boolean;
    inProgress: boolean;
}
export function computeMonthlyReport(data: HistoricalData, month: string, now: Date, options: HistoricalValuationOptions): HistoricalPoint {
    calendarDate(`${month}-01`);
    const start = belgradeMidnight(`${month}-01`), next = belgradeMidnight(addDays(monthEnd(`${month}-01`), 1));
    const cutoff = new Date(Math.min(next.getTime() - 1, now.getTime())), begin = new Date(start.getTime() - 1);
    const missing = new Set<string>();
    let stale = false;
    const rate = (currency: string, at: Date) => {
        const value = historicalRate(data, currency, at, options);
        if (!value)
            missing.add(`Kurs ${currency}/EUR · ${todayBelgrade(at)}`);
        else
            stale ||= value.stale;
        return value ? new D(value.value) : null;
    };
    const quote = (id: string, at: Date) => {
        const value = historicalQuote(data, id, at, options);
        if (!value)
            missing.add(`Cena ${data.instruments.find(i => i.id === id)?.symbol ?? id} · ${todayBelgrade(at)}`);
        else
            stale ||= value.stale;
        return value ? new D(value.value) : null;
    };
    const trades = data.trades.filter(t => t.status === "posted" && !t.correctedById), monthTrades = trades.filter(t => t.occurredAt >= start && t.occurredAt <= cutoff);
    const tradeForJournal = (id: string, originalId: string | null) => data.trades.find(t => t.journalTransactionId === id) ?? (originalId ? data.trades.find(t => t.journalTransactionId === originalId) : undefined);
    const postingRate = (p: HistoricalData["postingRows"][number]) => {
        const trade = tradeForJournal(p.id, p.correctionOfId);
        return trade && trade.tradeCurrencyCode === p.currencyCode ? new D(trade.tradeFxRateToEur) : rate(p.currencyCode, p.occurredAt);
    };
    const sum = (values: (Decimal | null)[]) => values.some(v => v === null) ? null : values.reduce<Decimal>((total, v) => total.plus(v!), new D(0));
    const plus = (a: Decimal | null, b: Decimal | null) => a === null || b === null ? null : a.plus(b);
    const periodPostings = data.postingRows.filter(p => p.occurredAt >= start && p.occurredAt <= cutoff);
    const convertPosting = (p: HistoricalData["postingRows"][number], sign = 1) => new D(p.amount).isZero() ? new D(0) : postingRate(p)?.times(p.amount).times(sign) ?? null;
    const income = sum(periodPostings.filter(p => p.account.classification === "income").map(p => convertPosting(p, -1)));
    const ledgerExpense = sum(periodPostings.filter(p => p.account.classification === "expense").map(p => convertPosting(p)));
    const tradeFees = monthTrades.filter(t => t.journalTransactionId && (t.type === "buy" || t.type === "sell")).reduce((v, t) => v.plus(new D(t.feeAmount ?? "0").times(t.tradeFxRateToEur)), new D(0));
    const expense = ledgerExpense?.plus(tradeFees) ?? null, net = income === null || expense === null ? null : income.minus(expense);
    const cashAccounts = new Map(data.postingRows.filter(p => ["asset", "receivable", "liability"].includes(p.account.classification) && !p.account.isSystem).map(p => [p.account.id, p.account]));
    let cashEnd: Decimal | null = new D(0), cashBegin: Decimal | null = new D(0), cashFx: Decimal | null = new D(0);
    for (const account of cashAccounts.values()) {
        const rows = data.postingRows.filter(p => p.account.id === account.id && p.occurredAt <= cutoff);
        const startNative = rows.filter(p => p.occurredAt < start).reduce((s, p) => s.plus(p.amount), new D(0)), endNative = rows.reduce((s, p) => s.plus(p.amount), new D(0));
        const startValue = startNative.isZero() ? new D(0) : rate(account.currencyCode, begin)?.times(startNative) ?? null;
        const endValue = endNative.isZero() ? new D(0) : rate(account.currencyCode, cutoff)?.times(endNative) ?? null;
        cashBegin = plus(cashBegin, startValue);
        cashEnd = plus(cashEnd, endValue);
        const flows = sum(rows.filter(p => p.occurredAt >= start).map(p => convertPosting(p)));
        cashFx = plus(cashFx, startValue === null || endValue === null || flows === null ? null : endValue.minus(startValue).minus(flows));
    }
    let portfolioEnd: Decimal | null = new D(0), portfolioBegin: Decimal | null = new D(0), market: Decimal | null = new D(0), portfolioFx: Decimal | null = new D(0);
    const instrumentIds = new Set(trades.filter(t => t.quantity && t.occurredAt <= cutoff).map(t => t.instrumentId));
    for (const id of instrumentIds) {
        const instrument = data.instruments.find(i => i.id === id)!;
        const relevant = trades.filter(t => t.instrumentId === id && t.quantity && t.occurredAt <= cutoff);
        const quantity = (at: Date) => relevant.filter(t => t.occurredAt <= at).reduce((v, t) => v.plus(new D(t.quantity!).times(t.type === "sell" ? -1 : 1)), new D(0));
        const q0 = quantity(begin), q1 = quantity(cutoff), native0 = q0.isZero() ? new D(0) : quote(id, begin)?.times(q0) ?? null, native1 = q1.isZero() ? new D(0) : quote(id, cutoff)?.times(q1) ?? null;
        const r0 = native0?.isZero() ? new D(0) : rate(instrument.quoteCurrencyCode, begin), r1 = (native1?.isZero() && native0?.isZero() && !relevant.some(t => t.occurredAt >= start)) ? new D(0) : rate(instrument.quoteCurrencyCode, cutoff);
        portfolioBegin = plus(portfolioBegin, native0 === null || r0 === null ? null : native0.times(r0));
        portfolioEnd = plus(portfolioEnd, native1 === null || r1 === null ? null : native1.times(r1));
        const flows = relevant.filter(t => t.occurredAt >= start);
        if (flows.some(t => t.tradeCurrencyCode !== instrument.quoteCurrencyCode)) {
            missing.add(`Valuta trgovanja ${instrument.symbol}`);
            market = null;
            portfolioFx = null;
            continue;
        }
        const principal = flows.reduce((s, t) => s.plus(new D(t.grossAmount ?? "0").times(t.type === "sell" ? -1 : 1)), new D(0));
        market = plus(market, native0 === null || native1 === null || r1 === null ? null : native1.minus(native0).minus(principal).times(r1));
        portfolioFx = plus(portfolioFx, native0 === null || r0 === null || r1 === null ? null : native0.times(r1.minus(r0)).plus(flows.reduce((s, t) => s.plus(new D(t.grossAmount ?? "0").times(t.type === "sell" ? -1 : 1).times(r1!.minus(t.tradeFxRateToEur))), new D(0))));
    }
    const adjustmentCash = sum(periodPostings.filter(p => p.account.classification === "equity" && p.account.subtype !== "investment").map(p => convertPosting(p, -1)));
    const openingInvestments = monthTrades.filter(t => t.type === "buy" && !t.journalTransactionId).reduce((s, t) => s.plus(new D(t.grossAmount ?? "0").times(t.tradeFxRateToEur)), new D(0));
    const adjustments = adjustmentCash?.plus(openingInvestments) ?? null;
    const end = plus(cashEnd, portfolioEnd), beginValue = plus(cashBegin, portfolioBegin), change = end === null || beginValue === null ? null : end.minus(beginValue), fx = plus(cashFx, portfolioFx);
    const attributed = sum([net, adjustments, market, fx]);
    const investmentFlow = (type: "buy" | "sell") => monthTrades.filter(t => t.type === type && t.journalTransactionId).reduce((s, t) => s.plus(new D(t.grossAmount ?? "0").times(t.tradeFxRateToEur)), new D(0));
    return { month, cutoff, netWorthEur: end?.toFixed() ?? null, incomeEur: income?.toFixed() ?? null, expenseEur: expense?.toFixed() ?? null, netEur: net?.toFixed() ?? null, savingsRate: calculateSavingsRate(income?.toFixed() ?? null, expense?.toFixed() ?? null), investmentBuysEur: investmentFlow("buy").toFixed(), investmentSalesEur: investmentFlow("sell").toFixed(), marketEffectEur: market?.toFixed() ?? null, fxEffectEur: fx?.toFixed() ?? null, adjustmentsEur: adjustments?.toFixed() ?? null, netWorthChangeEur: change?.toFixed() ?? null, unattributedEur: change === null || attributed === null ? null : change.minus(attributed).toFixed(), missingSources: [...missing].sort(), stale, inProgress: month === todayBelgrade(now).slice(0, 7) };
}
export async function getMonthlyReports(deps: ApplicationDependencies, input: {
    month: string;
    months: number;
}, options: HistoricalValuationOptions) {
    calendarDate(`${input.month}-01`);
    const today = todayBelgrade(deps.clock.now());
    const month = input.month > today.slice(0, 7) ? today.slice(0, 7) : input.month;
    return deps.unitOfWork.run(async (tx) => {
        const data = await new HistoryRepository(tx).load(deps.clock.now());
        const points = Array.from({ length: Math.max(1, Math.min(12, (Number(month.slice(0, 4)) - 1900) * 12 + Number(month.slice(5, 7)), Math.trunc(input.months) || 1)) }, (_, i) => {
            const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 - i, 1, 12));
            return computeMonthlyReport(data, d.toISOString().slice(0, 7), deps.clock.now(), options);
        }).reverse();
        return { points };
    }, { accessMode: "read only", isolationLevel: "repeatable read" });
}

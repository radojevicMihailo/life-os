import Decimal from "decimal.js";
import type { ApplicationDependencies } from "../application/ports";
import { accounts, accountPurposes, budgetLimits, cashAccountPreferences, investmentAccounts } from "../db/schema";
import { loadPlanningInTransaction } from "./planning";
import { HistoryRepository, historicalRate, type HistoricalValuationOptions } from "../db/repositories/history";
import { calculateAvailableCash, type CashAccountInput } from "../domain/available-cash";
import { calendarDate, todayBelgrade, monthEnd, addDays, daysBetween } from "../domain/calendar";
const D = Decimal.clone({ precision: 80 });
export async function getAvailableCash(deps: ApplicationDependencies, input: {
    endDate?: string;
} = {}, options: HistoricalValuationOptions = { exchangeRateStaleAfterMs: 36 * 3600000, marketDataStaleAfterMs: 36 * 3600000 }) {
    return deps.unitOfWork.run(async (tx) => {
        const now = deps.clock.now(), today = todayBelgrade(now);
        const [history, accountRows, purposes, budgets, preferences, investmentCash] = [
await new HistoryRepository(tx).load(now),
await tx.select().from(accounts),
await tx.select().from(accountPurposes),
await tx.select().from(budgetLimits),
await tx.select().from(cashAccountPreferences),
await tx.select({ id: investmentAccounts.cashAccountId }).from(investmentAccounts)
];
        const planning = await loadPlanningInTransaction(tx, now, "1900-01-01", today.slice(0, 4) === "2100" ? "2100-12-31" : addDays(today, 366));
        const incomes = planning.occurrences.filter(o => o.type === "income" && o.status === "pending" && o.dueDate >= today);
        const primary = incomes.filter(o => o.isPrimaryIncome), next = (primary.length ? primary : incomes)[0];
        let endDate = input.endDate ? calendarDate(input.endDate) : next ? addDays(next.dueDate, -1) : monthEnd(today);
        if (endDate < today)
            endDate = today;
        if (daysBetween(today, endDate) > 366)
            throw new RangeError("Izaberi period do 12 meseci.");
        const horizonReason = input.endDate ? "Izabrani datum" : next ? `Do prihoda: ${next.name} (${next.dueDate})` : "Do kraja meseca — nema planiranog prihoda";
        const pending = planning.occurrences.filter(o => o.type === "expense" && o.status === "pending" && o.dueDate <= endDate);
        const selected = accountRows.filter(a => a.classification === "asset" && !a.isSystem && a.isActive);
        const choices = selected.map(a => ({ ...a, included: preferences.find(p => p.accountId === a.id)?.included ?? (!investmentCash.some(c => c.id === a.id) && !["BTC", "ETH"].includes(a.currencyCode) && !a.subtype.includes("crypto")) }));
        let eurTotal = new D(0), complete = true, stale = false;
        const breakdown = choices.filter(a => a.included).map(account => {
            const balance = history.postingRows.filter(p => p.account.id === account.id).reduce((sum, p) => sum.plus(p.amount), new D(0)).toFixed();
            const reservations = purposes.filter(p => p.accountId === account.id), groups = new Map<string, CashAccountInput["groups"][number]>();
            let goalReserved = new D(0), otherReserved = new D(0);
            for (const reservation of reservations) {
                if (reservation.goalId) {
                    goalReserved = goalReserved.plus(reservation.amount);
                    continue;
                }
                const budget = budgets.find(b => b.id === reservation.budgetLimitId);
                if (!budget) {
                    otherReserved = otherReserved.plus(reservation.amount);
                    continue;
                }
                const key = `${budget.categoryId}:${budget.month.slice(0, 7)}`, group = groups.get(key) ?? { categoryId: budget.categoryId, month: budget.month.slice(0, 7), reserved: "0", pending: "0" };
                group.reserved = new D(group.reserved).plus(reservation.amount).toFixed();
                groups.set(key, group);
            }
            for (const bill of pending.filter(o => o.accountId === account.id)) {
                const key = `${bill.categoryId}:${bill.dueDate.slice(0, 7)}`, group = groups.get(key) ?? { categoryId: bill.categoryId, month: bill.dueDate.slice(0, 7), reserved: "0", pending: "0" };
                group.pending = new D(group.pending).plus(bill.amount).toFixed();
                groups.set(key, group);
            }
            const native = calculateAvailableCash([{ id: account.id, balance, goalReserved: goalReserved.toFixed(), otherReserved: otherReserved.toFixed(), groups: [...groups.values()], uncoveredPending: "0" }], daysBetween(today, endDate) + 1);
            const rate = historicalRate(history, account.currencyCode, now, options);
            if (!rate && !new D(native.available).isZero())
                complete = false;
            if (rate) {
                eurTotal = eurTotal.plus(new D(native.available).times(rate.value));
                stale ||= rate.stale;
            }
            return { accountId: account.id, accountName: account.name, currencyCode: account.currencyCode, balance, goalReserved: goalReserved.toFixed(), otherReserved: otherReserved.toFixed(), groups: [...groups.values()], ...native, rate };
        });
        const days = daysBetween(today, endDate) + 1;
        return { endDate, horizonReason, days, nextIncome: next ? { name: next.name, date: next.dueDate, amount: next.amount, currencyCode: next.currencyCode } : null,
            amountEur: complete ? eurTotal.toFixed() : null, dailyEur: complete ? D.max(eurTotal, 0).div(days).toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed() : null, deficitEur: complete ? D.max(eurTotal.negated(), 0).toFixed() : null, complete, stale, breakdown, choices, overdueCount: pending.filter(o => o.overdue).length };
    }, { accessMode: "read only", isolationLevel: "repeatable read" });
}

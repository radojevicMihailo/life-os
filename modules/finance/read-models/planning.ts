import { eq } from "drizzle-orm";
import type { ApplicationDependencies } from "../application/ports";
import type { DbTx } from "../db/client";
import { accounts, categories, planRules, planOccurrences } from "../db/schema";
import { expandAllOccurrences, type PlannedOccurrence } from "../domain/planning";
import { calendarDate, todayBelgrade, daysBetween } from "../domain/calendar";
export async function loadPlanningInTransaction(tx: DbTx, now: Date, from: string, to: string) {
    calendarDate(from);
    calendarDate(to);
    const [rules, exceptions] = [
await tx.select({ rule: planRules, accountName: accounts.name, currencyCode: accounts.currencyCode, categoryName: categories.name }).from(planRules).innerJoin(accounts, eq(accounts.id, planRules.accountId)).innerJoin(categories, eq(categories.id, planRules.categoryId)).orderBy(planRules.startDate, planRules.id),
await tx.select().from(planOccurrences)
];
    const today = todayBelgrade(now), occurrences: PlannedOccurrence[] = [];
    const byKey = new Map(exceptions.map(e => [`${e.ruleId}:${e.dueDate}`, e]));
    for (const { rule, accountName, currencyCode, categoryName } of rules) {
        const lastDate = rule.archivedAt && todayBelgrade(rule.archivedAt) < to ? todayBelgrade(rule.archivedAt) : to;
        for (const occurrence of expandAllOccurrences(rule, from, lastDate)) {
            const stored = byKey.get(`${rule.id}:${occurrence.dueDate}`);
            occurrences.push({ ...occurrence, name: rule.name, type: rule.type, accountId: rule.accountId, categoryId: rule.categoryId, amount: rule.amount, currencyCode, isPrimaryIncome: rule.isPrimaryIncome, status: stored?.status ?? "pending", journalTransactionId: stored?.journalTransactionId ?? null, overdue: occurrence.dueDate < today, accountName, categoryName, ...(stored?.snapshot ? stored.snapshot : {}) });
        }
    }
    // Confirmed snapshots survive rule edits/archive, including dates no longer in its schedule.
    for (const exception of exceptions)
        if (exception.status === "confirmed" && exception.snapshot && exception.dueDate >= from && exception.dueDate <= to && !occurrences.some(o => o.ruleId === exception.ruleId && o.dueDate === exception.dueDate))
            occurrences.push({ ruleId: exception.ruleId, dueDate: exception.dueDate, ...exception.snapshot, status: "confirmed", journalTransactionId: exception.journalTransactionId, overdue: exception.dueDate < today });
    occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.ruleId.localeCompare(b.ruleId));
    return { rules: rules.map(x => ({ ...x.rule, accountName: x.accountName, currencyCode: x.currencyCode, categoryName: x.categoryName })), occurrences };
}
export async function listPlanning(deps: ApplicationDependencies, { from, to }: {
    from: string;
    to: string;
}) {
    if (daysBetween(from, to) > 366)
        throw new RangeError("Prikaži najviše 12 meseci.");
    return deps.unitOfWork.run(tx => loadPlanningInTransaction(tx, deps.clock.now(), from, to), { accessMode: "read only", isolationLevel: "repeatable read" });
}

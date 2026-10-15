import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import type { ApplicationDependencies } from "./ports";
import { applicationError } from "./ports";
import { AccountsRepository } from "../db/repositories/accounts";
import { LedgerRepository } from "../db/repositories/ledger";
import { PlanningRepository, lockPlanning } from "../db/repositories/planning";
import { planRules, planOccurrences, accounts, categories, currencies, cashAccountPreferences } from "../db/schema";
import { expandOccurrences, type PlanRule } from "../domain/planning";
import { calendarDate, todayBelgrade } from "../domain/calendar";
import { Money } from "../domain/money";
import { recordTransactionInTransaction } from "./transactions";
import type { DbTx } from "../db/client";
export type SavePlanInput = Omit<PlanRule, "id" | "archivedAt"> & {
    id?: string;
};
async function validateReferences(tx: DbTx, input: SavePlanInput) {
    const [account] = await tx.select().from(accounts).where(eq(accounts.id, input.accountId));
    if (!account || account.isSystem || account.classification !== "asset" || !account.isActive)
        applicationError("account_inactive");
    const [category] = await tx.select().from(categories).where(eq(categories.id, input.categoryId));
    if (!category || !category.isActive || category.classification !== input.type)
        applicationError("category_classification_mismatch");
    const [currency] = await tx.select().from(currencies).where(eq(currencies.code, account.currencyCode));
    if (!currency)
        applicationError("currency_not_found");
    const amount = Money.parse(new Decimal(input.amount).toFixed(), { code: currency.code, minorUnit: Number(currency.minorUnit) }).amount;
    return { account, category, amount };
}
export async function savePlan(deps: ApplicationDependencies, input: SavePlanInput): Promise<PlanRule> {
    return deps.unitOfWork.run(async (tx) => {
        await lockPlanning(tx);
        if (input.id) {
            const old = await new PlanningRepository(tx).lockRule(input.id);
            if (old.archivedAt)
                applicationError("plan_not_found");
        }
        calendarDate(input.startDate);
        if (input.endDate)
            calendarDate(input.endDate);
        if (input.endDate && input.endDate < input.startDate || !["once", "weekly", "monthly", "yearly"].includes(input.frequency) || !["income", "expense"].includes(input.type) || !input.name.trim() || input.isPrimaryIncome && input.type !== "income")
            applicationError("plan_invalid");
        const { amount } = await validateReferences(tx, input);
        const values = { name: input.name.trim().slice(0, 200), type: input.type, accountId: input.accountId, categoryId: input.categoryId, amount, startDate: input.startDate, endDate: input.endDate, frequency: input.frequency, isPrimaryIncome: input.isPrimaryIncome, updatedAt: deps.clock.now() };
        const [row] = input.id ? await tx.update(planRules).set(values).where(eq(planRules.id, input.id)).returning() : await tx.insert(planRules).values({ ...values, id: deps.ids.nextId("planRule"), createdAt: deps.clock.now() }).returning();
        return row;
    });
}
async function pendingRule(tx: DbTx, ruleId: string, dueDate: string) {
    const repo = new PlanningRepository(tx), rule = await repo.lockRule(ruleId);
    const occurrence = await repo.getOccurrence(ruleId, dueDate);
    if (occurrence?.status === "confirmed")
        return { rule, occurrence };
    if (rule.archivedAt && dueDate > todayBelgrade(rule.archivedAt))
        applicationError("plan_not_found");
    if (!expandOccurrences(rule, dueDate, dueDate).length)
        applicationError("plan_invalid");
    return { rule, occurrence };
}
export async function confirmOccurrence(deps: ApplicationDependencies, input: {
    ruleId: string;
    dueDate: string;
    amount: string;
    occurredAt: Date;
}): Promise<{
    id: string;
}> {
    return deps.unitOfWork.run(async (tx) => {
        await lockPlanning(tx);
        const { rule, occurrence } = await pendingRule(tx, input.ruleId, input.dueDate);
        if (occurrence?.status === "confirmed") {
            if (!new Decimal(occurrence.snapshot!.amount).eq(input.amount) || occurrence.snapshot!.occurredAt !== input.occurredAt.toISOString())
                applicationError("plan_occurrence_conflict");
            return { id: occurrence.journalTransactionId! };
        }
        if (occurrence?.status === "skipped")
            applicationError("plan_occurrence_conflict");
        if (!Number.isFinite(input.occurredAt.getTime()) || todayBelgrade(input.occurredAt) > todayBelgrade(deps.clock.now()))
            applicationError("plan_invalid");
        const { account, category, amount } = await validateReferences(tx, { ...rule, amount: input.amount });
        const journal = await recordTransactionInTransaction(deps, tx, { type: rule.type, accountId: rule.accountId, categoryId: rule.categoryId, amount, occurredAt: input.occurredAt, description: rule.name });
        await tx.insert(planOccurrences).values({ id: deps.ids.nextId("planOccurrence"), ruleId: rule.id, dueDate: input.dueDate, status: "confirmed", journalTransactionId: journal.id, snapshot: { name: rule.name, type: rule.type, accountId: rule.accountId, categoryId: rule.categoryId, amount, currencyCode: account.currencyCode, occurredAt: input.occurredAt.toISOString(), accountName: account.name, categoryName: category.name, isPrimaryIncome: rule.isPrimaryIncome } });
        return { id: journal.id };
    });
}
export async function linkOccurrence(deps: ApplicationDependencies, input: {
    ruleId: string;
    dueDate: string;
    transactionId: string;
}): Promise<{
    id: string;
}> {
    return deps.unitOfWork.run(async (tx) => {
        await lockPlanning(tx);
        const { rule, occurrence } = await pendingRule(tx, input.ruleId, input.dueDate);
        if (occurrence?.journalTransactionId === input.transactionId)
            return { id: input.transactionId };
        if (occurrence)
            applicationError("plan_occurrence_conflict");
        const journal = await new LedgerRepository(tx).lockJournal(input.transactionId);
        const { account, category } = await validateReferences(tx, rule);
        const posting = journal.postings.find(p => p.account.id === rule.accountId);
        if (journal.status !== "posted" || journal.correctedById || journal.type !== rule.type || !posting || !journal.postings.some(p => p.categoryId === rule.categoryId) || posting.currencyCode !== account.currencyCode)
            applicationError("plan_occurrence_conflict");
        const linked = await tx.select({ id: planOccurrences.id }).from(planOccurrences).where(eq(planOccurrences.journalTransactionId, journal.id));
        if (linked.length)
            applicationError("plan_occurrence_conflict");
        await tx.insert(planOccurrences).values({ id: deps.ids.nextId("planOccurrence"), ruleId: rule.id, dueDate: input.dueDate, status: "confirmed", journalTransactionId: journal.id, snapshot: { name: rule.name, type: rule.type, accountId: rule.accountId, categoryId: rule.categoryId, amount: new Decimal(posting.amount).abs().toFixed(), currencyCode: account.currencyCode, occurredAt: journal.occurredAt.toISOString(), accountName: account.name, categoryName: category.name, isPrimaryIncome: rule.isPrimaryIncome } });
        return { id: journal.id };
    });
}
export async function skipOccurrence(deps: ApplicationDependencies, input: {
    ruleId: string;
    dueDate: string;
}): Promise<void> {
    await deps.unitOfWork.run(async (tx) => {
        await lockPlanning(tx);
        const { rule, occurrence } = await pendingRule(tx, input.ruleId, input.dueDate);
        if (occurrence?.status === "confirmed")
            applicationError("plan_occurrence_conflict");
        if (!occurrence)
            await tx.insert(planOccurrences).values({ id: deps.ids.nextId("planOccurrence"), ruleId: rule.id, dueDate: input.dueDate, status: "skipped" });
    });
}
export async function archivePlan(deps: ApplicationDependencies, input: {
    id: string;
}): Promise<void> { await deps.unitOfWork.run(async (tx) => { await lockPlanning(tx); await new PlanningRepository(tx).lockRule(input.id); await tx.update(planRules).set({ archivedAt: deps.clock.now(), updatedAt: deps.clock.now() }).where(eq(planRules.id, input.id)); }); }
export async function setCashAccountPreferences(deps: ApplicationDependencies, input: {
    accounts: {
        id: string;
        included: boolean;
    }[];
}): Promise<void> {
    await deps.unitOfWork.run(async (tx) => {
        for (const preference of [...input.accounts].sort((a, b) => a.id.localeCompare(b.id))) {
            const [account] = await new AccountsRepository(tx).lockByIds([preference.id]);
            if (!account || account.isSystem || account.classification !== "asset")
                applicationError("account_classification_unsupported");
            await tx.insert(cashAccountPreferences).values({ accountId: account.id, included: preference.included }).onConflictDoUpdate({ target: cashAccountPreferences.accountId, set: { included: preference.included } });
        }
    });
}

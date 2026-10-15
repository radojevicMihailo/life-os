import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase, type TestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS } from "../support/database";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { seedDatabase } from "@/modules/finance/db/seed";
import { createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import { recordTransaction, getNativeBalances, correctTransaction, deleteTransaction } from "@/modules/finance/application/transactions";
import { savePlan, confirmOccurrence, skipOccurrence, linkOccurrence, archivePlan } from "@/modules/finance/application/planning";
import { listPlanning } from "@/modules/finance/read-models/planning";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
describe("atomic planned payments", () => {
    let db: TestDatabase, deps: ApplicationDependencies, bank: {
        id: string;
    }, category: {
        id: string;
    }, rule: {
        id: string;
    };
    beforeAll(async () => { db = await createTestDatabase(); await migrateDatabase(db.db); }, TEST_DATABASE_HOOK_TIMEOUT_MS);
    afterAll(async () => { await db?.close(); });
    beforeEach(async () => {
        await db.pool.query("truncate finance_plan_rules, finance_journal_transactions, finance_currencies, finance_categories cascade");
        await seedDatabase(db.db);
        deps = { unitOfWork: { run: (work, config) => db.db.transaction(work, config) }, clock: { now: () => new Date("2026-10-15T12:00:00Z") }, ids: { nextId: kind => `${kind}-${randomUUID()}` } };
        bank = await createAccount(deps, { name: "Test banka", classification: "asset", currencyCode: "EUR", subtype: "bank" });
        category = await createCategory(deps, { name: "Računi", classification: "expense" });
        await recordTransaction(deps, { type: "opening_balance", accountId: bank.id, amount: "1000" });
        rule = await savePlan(deps, { name: "Račun", type: "expense", accountId: bank.id, categoryId: category.id, amount: "100", startDate: "2026-10-15", endDate: null, frequency: "monthly", isPrimaryIncome: false });
    });
    const input = () => ({ ruleId: rule.id, dueDate: "2026-10-15", amount: "100", occurredAt: new Date("2026-10-15T10:00:00Z") });
    it("confirms concurrent retries exactly once", async () => {
        const [a, b] = await Promise.all([confirmOccurrence(deps, input()), confirmOccurrence(deps, input())]);
        expect(a.id).toBe(b.id);
        expect((await getNativeBalances(deps, { accountIds: [bank.id] }))[0].displayBalance).toBe("900.00");
    });
    it("keeps failed validation atomic", async () => {
        await expect(confirmOccurrence(deps, { ...input(), dueDate: "2026-10-16" })).rejects.toMatchObject({ code: "plan_invalid" });
        expect((await db.pool.query("select count(*) from finance_plan_occurrences")).rows[0].count).toBe("0");
    });
    it("moves confirmation through correction and reopens it after deletion", async () => {
        const confirmed = await confirmOccurrence(deps, input());
        const corrected = await correctTransaction(deps, { originalId: confirmed.id, replacement: { type: "expense", accountId: bank.id, categoryId: category.id, amount: "120" } });
        let view = await listPlanning(deps, { from: "2026-10-01", to: "2026-10-31" });
        expect(view.occurrences[0]).toMatchObject({ status: "confirmed", amount: "120", journalTransactionId: corrected.replacement.id });
        await deleteTransaction(deps, { id: corrected.replacement.id });
        view = await listPlanning(deps, { from: "2026-10-01", to: "2026-10-31" });
        expect(view.occurrences[0].status).toBe("pending");
        expect((await getNativeBalances(deps, { accountIds: [bank.id] }))[0].displayBalance).toBe("1000.00");
    });
    it("skips idempotently and prevents confirming skipped occurrence", async () => {
        await skipOccurrence(deps, input());
        await skipOccurrence(deps, input());
        await expect(confirmOccurrence(deps, input())).rejects.toMatchObject({ code: "plan_occurrence_conflict" });
    });
    it("links existing payment without creating additional cash movement", async () => {
        const payment = await recordTransaction(deps, { type: "expense", accountId: bank.id, categoryId: category.id, amount: "90" });
        await linkOccurrence(deps, { ...input(), transactionId: payment.id });
        expect((await getNativeBalances(deps, { accountIds: [bank.id] }))[0].displayBalance).toBe("910.00");
    });
    it("preserves confirmed snapshot after changing schedule", async () => {
        await confirmOccurrence(deps, input());
        await savePlan(deps, { id: rule.id, name: "Promenjen", type: "expense", accountId: bank.id, categoryId: category.id, amount: "200", startDate: "2026-10-20", endDate: null, frequency: "monthly", isPrimaryIncome: false });
        const view = await listPlanning(deps, { from: "2026-10-01", to: "2026-10-31" });
        expect(view.occurrences.find(o => o.status === "confirmed")).toMatchObject({ name: "Račun", amount: "100.00", dueDate: "2026-10-15" });
    });
    it("archives future planning while keeping already due bills payable", async () => {
        await savePlan(deps, { id: rule.id, name: "Račun", type: "expense", accountId: bank.id, categoryId: category.id, amount: "100", startDate: "2026-10-01", endDate: null, frequency: "weekly", isPrimaryIncome: false });
        await archivePlan(deps, { id: rule.id });
        const view = await listPlanning(deps, { from: "2026-10-01", to: "2026-10-31" });
        expect(view.occurrences.map(o => o.dueDate)).toEqual(["2026-10-01", "2026-10-08", "2026-10-15"]);
        await expect(confirmOccurrence(deps, { ...input(), dueDate: "2026-10-01" })).resolves.toHaveProperty("id");
    });
    it("keeps the confirmation linked when correcting its category", async () => {
        const payment = await confirmOccurrence(deps, input());
        const category2 = await createCategory(deps, { name: "Ispravljena kategorija", classification: "expense" });
        const correction = await correctTransaction(deps, { originalId: payment.id, replacement: { type: "expense", accountId: bank.id, categoryId: category2.id, amount: "120" } });
        expect((await listPlanning(deps, { from: "2026-10-01", to: "2026-10-31" })).occurrences[0]).toMatchObject({ status: "confirmed", categoryId: category2.id, categoryName: "Ispravljena kategorija", journalTransactionId: correction.replacement.id });
    });
});

import { listBudgets } from "@/modules/finance/read-models/budgets";
import { setBudgetLimit } from "@/modules/finance/application/budgets";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase, type TestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS } from "../support/database";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { seedDatabase } from "@/modules/finance/db/seed";
import { createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import { recordTransaction } from "@/modules/finance/application/transactions";
import { savePlan, setCashAccountPreferences } from "@/modules/finance/application/planning";
import { getAvailableCash } from "@/modules/finance/read-models/available-cash";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
describe("available cash read model", () => {
    let db: TestDatabase, deps: ApplicationDependencies, bank: {
        id: string;
    }, category: {
        id: string;
    };
    beforeAll(async () => { db = await createTestDatabase(); await migrateDatabase(db.db); }, TEST_DATABASE_HOOK_TIMEOUT_MS);
    afterAll(async () => { await db?.close(); });
    beforeEach(async () => {
        await db.pool.query("truncate finance_journal_transactions,finance_currencies,finance_categories cascade");
        await seedDatabase(db.db);
        deps = { unitOfWork: { run: (work, config) => db.db.transaction(work, config) }, clock: { now: () => new Date("2026-10-15T12:00:00Z") }, ids: { nextId: k => `${k}-${randomUUID()}` } };
        bank = await createAccount(deps, { name: "Tekući", classification: "asset", currencyCode: "EUR", subtype: "bank" });
        category = await createCategory(deps, { name: "Trošak testa", classification: "expense" });
        await recordTransaction(deps, { type: "opening_balance", accountId: bank.id, amount: "1000" });
    });
    it("deducts repeated obligations once per reservation group", async () => {
        await db.pool.query("insert into finance_budget_limits(id,category_id,month,currency_code,amount) values ('b',$1,'2026-10-01','EUR',300)", [category.id]);
        await db.pool.query("insert into finance_account_purposes(id,account_id,currency_code,budget_limit_id,amount) values ('p',$1,'EUR','b',300)", [bank.id]);
        await savePlan(deps, { name: "Račun", type: "expense", accountId: bank.id, categoryId: category.id, amount: "100", startDate: "2026-10-01", endDate: null, frequency: "weekly", isPrimaryIncome: false });
        const view = await getAvailableCash(deps);
        expect(view.amountEur).toBe("500");
        expect(view.overdueCount).toBe(2);
    });
    it("excludes future posted amounts and persists cash account choices", async () => {
        await recordTransaction(deps, { type: "opening_balance", accountId: bank.id, amount: "500", occurredAt: new Date("2026-11-01T12:00:00Z") });
        expect((await getAvailableCash(deps)).amountEur).toBe("1000");
        await setCashAccountPreferences(deps, { accounts: [{ id: bank.id, included: false }] });
        expect((await getAvailableCash(deps)).amountEur).toBe("0");
    });
    it("excludes income on the horizon and never spends expected salary", async () => {
        const income = await createCategory(deps, { name: "Plata testa", classification: "income" });
        await savePlan(deps, { name: "Plata", type: "income", accountId: bank.id, categoryId: income.id, amount: "2000", startDate: "2026-10-20", endDate: null, frequency: "monthly", isPrimaryIncome: true });
        const view = await getAvailableCash(deps);
        expect(view.endDate).toBe("2026-10-19");
        expect(view.days).toBe(5);
        expect(view.amountEur).toBe("1000");
    });
    it("projects budget spending using pending obligations and leaves absent history empty", async () => {
        await setBudgetLimit(deps, { categoryId: category.id, currencyCode: "EUR", month: "2026-10", amount: "500" });
        await recordTransaction(deps, { type: "expense", accountId: bank.id, categoryId: category.id, amount: "100", occurredAt: new Date("2026-10-05T12:00:00Z") });
        await savePlan(deps, { name: "Poznata obaveza", type: "expense", accountId: bank.id, categoryId: category.id, amount: "400", startDate: "2026-10-20", endDate: null, frequency: "once", isPrimaryIncome: false });
        const view = await listBudgets(deps, { month: "2026-10" });
        const budget = view.items.find(i => i.categoryId === category.id)!;
        expect(budget.projection.projected).toBe("500");
        expect(budget.previousMonths.every(p => p.spent === null)).toBe(true);
    });
});

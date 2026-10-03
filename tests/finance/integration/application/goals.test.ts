import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createAccount, archiveAccount } from "@/modules/finance/application/accounts";
import { createGoal, getGoalProgress, updateGoal, archiveGoal } from "@/modules/finance/application/goals";
import { setAccountPurpose } from "@/modules/finance/application/account-purposes";
import { setBudgetLimit } from "@/modules/finance/application/budgets";
import { createCategory } from "@/modules/finance/application/categories";
import { recordTransaction } from "@/modules/finance/application/transactions";
import { setManualOverride } from "@/modules/finance/application/valuation";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { seedDatabase } from "@/modules/finance/db/seed";
import { listGoals } from "@/modules/finance/read-models/goals";
import { getAccountPurposes } from "@/modules/finance/read-models/account-purposes";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";
const now = new Date("2026-10-03T12:00:00Z");
const options = { exchangeRateStaleAfterMs: 3600000 };

describe("goal funds", () => {
  let testDb: TestDatabase;
  let deps: ApplicationDependencies;
  let sequence = 0;
  beforeAll(async () => {
    testDb = await createTestDatabase(); await migrateDatabase(testDb.db); await seedDatabase(testDb.db);
    deps = { unitOfWork: { run: (work, config) => testDb.db.transaction(work, config) }, clock: { now: () => now }, ids: { nextId: (kind) => `${kind}-fund-${++sequence}` } };
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);
  afterAll(async () => { await testDb?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);
  const goal = (currency = "EUR", amount = "1000") => createGoal(deps, { name: `Fund ${++sequence}`, targetCurrencyCode: currency, targetAmount: amount });
  async function cash(currency: string, balance: string) {
    const a = await createAccount(deps, { name: `Cash ${++sequence}`, classification: "asset", subtype: "cash", currencyCode: currency });
    await recordTransaction(deps, { accountId: a.id, amount: balance, type: "opening_balance" }); return a;
  }
  const reserve = (accountId: string, targetId: string, amount: string) => setAccountPurpose(deps, { accountId, targetId, amount, targetType: "goal" });
  const progress = (id: string) => getGoalProgress(deps, { id }, options);

  it("creates funds without accounts and validates target currency and precision", async () => {
    expect(await goal()).toMatchObject({ accountId: null });
    await expect(goal("EUR", "0")).rejects.toMatchObject({ code: "money_non_positive" });
    await expect(goal("EUR", "0.001")).rejects.toMatchObject({ code: "money_precision_exceeded" });
    await expect(goal("ZZZ")).rejects.toMatchObject({ code: "currency_not_found" });
  });
  it("sums only assigned money: 800 EUR plus 200 EUR worth of RSD reaches 1000", async () => {
    const eur = await cash("EUR", "1500"); const rsd = await cash("RSD", "30000"); const fund = await goal();
    await reserve(eur.id, fund.id, "800"); await reserve(rsd.id, fund.id, "25000");
    await setManualOverride(deps, { kind: "exchange_rate", baseCurrencyCode: "RSD", quoteCurrencyCode: "EUR", value: "0.008", effectiveAt: now });
    expect(await progress(fund.id)).toMatchObject({ balance: "1000", percentage: "100", complete: true, underfunded: false });
    expect((await progress(fund.id)).allocations).toHaveLength(2);
    expect((await getAccountPurposes(deps)).summaries[eur.id].free).toBe("700");
    await updateGoal(deps, { id: fund.id, name: "Changed target", targetCurrencyCode: "RSD", targetAmount: "125000" });
    expect(await progress(fund.id)).toMatchObject({ balance: "125000", percentage: "100" });
  });
  it("shares one account between separate goals and budgets without double reservation", async () => {
    const a = await cash("EUR", "1000"); const first = await goal(); const second = await goal();
    const category = await createCategory(deps, { name: `Budget ${++sequence}`, classification: "expense" });
    await setBudgetLimit(deps, { categoryId: category.id, month: "2026-10", currencyCode: "EUR", amount: "100" });
    const budget = (await testDb.pool.query("select id from finance_budget_limits where category_id=$1", [category.id])).rows[0];
    await reserve(a.id, first.id, "500"); await reserve(a.id, second.id, "200");
    await setAccountPurpose(deps, { accountId: a.id, targetId: budget.id, targetType: "budget", amount: "100" });
    expect(await progress(first.id)).toMatchObject({ balance: "500", percentage: "50" });
    expect(await progress(second.id)).toMatchObject({ balance: "200", percentage: "20" });
    expect((await getAccountPurposes(deps)).summaries[a.id]).toMatchObject({ reserved: "800", free: "200" });
    await expect(reserve(a.id, second.id, "401")).rejects.toMatchObject({ code: "account_purpose_insufficient_balance" });
    await recordTransaction(deps, { type: "expense", accountId: a.id, categoryId: category.id, amount: "400" });
    expect(await progress(first.id)).toMatchObject({ balance: "500", underfunded: true, allocations: [{ accountDeficit: "200", underfunded: true }] });
    await archiveAccount(deps, { id: a.id });
    expect((await progress(first.id)).allocations[0].accountActive).toBe(false);
  });
  it("keeps missing rates unknown, stale sources visible and manual overrides authoritative", async () => {
    const a = await cash("USD", "100"); const fund = await goal("HUF", "10000"); await reserve(a.id, fund.id, "100");
    expect(await progress(fund.id)).toMatchObject({ balance: null, percentage: null, complete: false });
    await testDb.pool.query("insert into finance_exchange_rates(id,base_currency_code,quote_currency_code,rate,provider,provider_timestamp,retrieved_at,status) values ('fund-usd-rate','USD','EUR',0.9,'nbs',$1,$2,'valid'),('fund-huf-rate','HUF','EUR',0.003,'nbs',$1,$2,'valid')", [new Date("2026-10-01T12:00:00Z"), now]);
    expect(await progress(fund.id)).toMatchObject({ balance: "30000", complete: true, stale: true, allocations: [{ valuation: { stale: true, sourceToEur: { source: "nbs" } } }] });
    await setManualOverride(deps, { kind: "exchange_rate", baseCurrencyCode: "USD", quoteCurrencyCode: "EUR", value: "0.8", effectiveAt: now });
    expect((await progress(fund.id)).allocations[0].valuation.sourceToEur).toMatchObject({ source: "manual", manual: true, stale: false });
  });
  it("retains legacy references but never treats legacy balances as assigned savings", async () => {
    const a = await cash("EUR", "1000");
    await testDb.pool.query("insert into finance_goals(id,name,account_id,target_currency_code,target_amount) values ('legacy-fund','Legacy',$1,'EUR',1000)", [a.id]);
    expect((await listGoals(deps, options)).items.find((g) => g.id === "legacy-fund")).toMatchObject({ balance: "0", legacyAccountId: a.id, legacyAccountName: a.name, allocations: [] });
    await reserve(a.id, "legacy-fund", "100");
    await updateGoal(deps, { id: "legacy-fund", name: "Legacy updated", targetCurrencyCode: "EUR", targetAmount: "200" });
    expect(await progress("legacy-fund")).toMatchObject({ balance: "100", percentage: "50", legacyAccountId: a.id });
    await archiveGoal(deps, { id: "legacy-fund" });
    expect((await getAccountPurposes(deps)).summaries[a.id].reserved).toBe("100");
  });
});

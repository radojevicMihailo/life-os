import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setAccountPurpose, removeAccountPurpose } from "@/modules/finance/application/account-purposes";
import { archiveAccount, createAccount, updateAccount } from "@/modules/finance/application/accounts";
import { createGoal, updateGoal } from "@/modules/finance/application/goals";
import { createCategory } from "@/modules/finance/application/categories";
import { setBudgetLimit } from "@/modules/finance/application/budgets";
import { recordTransaction } from "@/modules/finance/application/transactions";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { seedDatabase } from "@/modules/finance/db/seed";
import { getAccountPurposes } from "@/modules/finance/read-models/account-purposes";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";

describe("account purpose reservations", () => {
  let testDb: TestDatabase;
  let deps: ApplicationDependencies;
  let sequence = 0;
  beforeAll(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
    await seedDatabase(testDb.db);
    deps = { unitOfWork: { run: (work, config) => testDb.db.transaction(work, config) },
      clock: { now: () => new Date("2026-10-02T12:00:00Z") }, ids: { nextId: (kind) => `${kind}-purpose-test-${++sequence}` } };
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);
  afterAll(async () => { await testDb?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  async function account(currencyCode = "EUR", classification: "asset" | "liability" = "asset") {
    return createAccount(deps, { name: `Account ${++sequence}`, currencyCode, classification, subtype: "cash" });
  }
  async function goal(accountId: string, targetCurrencyCode = "EUR") {
    return createGoal(deps, { name: `Goal ${++sequence}`, accountId, targetCurrencyCode, targetAmount: "1000" });
  }

  it("reserves for goals and budgets without changing the ledger; spending shows a deficit", async () => {
    const cash = await account();
    const target = await goal(cash.id);
    const category = await createCategory(deps, { name: `Food ${++sequence}`, classification: "expense" });
    await setBudgetLimit(deps, { categoryId: category.id, month: "2026-10", currencyCode: "EUR", amount: "100" });
    const budget = (await testDb.pool.query("select id from finance_budget_limits where category_id=$1", [category.id])).rows[0];
    await recordTransaction(deps, { type: "opening_balance", accountId: cash.id, amount: "100" });
    const before = (await testDb.pool.query("select count(*) from finance_journal_postings")).rows[0].count;
    const reservation = await setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "60" });
    await setAccountPurpose(deps, { accountId: cash.id, targetType: "budget", targetId: budget.id, amount: "20" });
    expect((await testDb.pool.query("select count(*) from finance_journal_postings")).rows[0].count).toBe(before);
    expect((await getAccountPurposes(deps)).summaries[cash.id]).toMatchObject({ reserved: "80", free: "20", deficit: "0" });
    await recordTransaction(deps, { type: "expense", accountId: cash.id, categoryId: category.id, amount: "50" });
    expect((await getAccountPurposes(deps)).summaries[cash.id]).toMatchObject({ free: "0", deficit: "30" });
    // Underfunding must not prevent repairing a reservation.
    await setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "40" });
    await removeAccountPurpose(deps, { accountId: cash.id, id: reservation.id });
    expect((await getAccountPurposes(deps)).summaries[cash.id]).toMatchObject({ reserved: "20", free: "30", deficit: "0" });
  });

  it("serializes competing reservations so only one fits", async () => {
    const cash = await account();
    const first = await goal(cash.id);
    const second = await goal(cash.id);
    await recordTransaction(deps, { type: "opening_balance", accountId: cash.id, amount: "100" });
    const results = await Promise.allSettled([first, second].map((target) => setAccountPurpose(deps,
      { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "60" })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "account_purpose_insufficient_balance" });
    expect((await getAccountPurposes(deps)).summaries[cash.id]).toMatchObject({ reserved: "60", free: "40" });
  });

  it("rejects currency mismatch, inactive and nonasset accounts, unknown targets, and excess precision", async () => {
    const cash = await account();
    const target = await goal(cash.id);
    const usd = await account("USD");
    const liability = await account("EUR", "liability");
    const inactive = await account();
    await archiveAccount(deps, { id: inactive.id });
    await recordTransaction(deps, { type: "opening_balance", accountId: cash.id, amount: "100" });
    for (const [accountId, code] of [[usd.id, "account_purpose_currency_mismatch"], [liability.id, "goal_account_must_be_asset"], [inactive.id, "account_inactive"]]) {
      await expect(setAccountPurpose(deps, { accountId, targetType: "goal", targetId: target.id, amount: "10" })).rejects.toMatchObject({ code });
    }
    await expect(setAccountPurpose(deps, { accountId: cash.id, targetType: "budget", targetId: "missing", amount: "10" })).rejects.toMatchObject({ code: "account_purpose_target_invalid" });
    await expect(setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "0" })).rejects.toMatchObject({ code: "money_non_positive" });
    await expect(setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "-1" })).rejects.toMatchObject({ code: "money_non_positive" });
    await expect(setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "0.001" })).rejects.toMatchObject({ code: "money_precision_exceeded" });
    await expect(setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "101" })).rejects.toMatchObject({ code: "account_purpose_insufficient_balance" });
    expect((await getAccountPurposes(deps)).summaries[cash.id].items).toHaveLength(0);
  });

  it("prevents changing reserved currencies and permits release on archived accounts", async () => {
    const goalAccount = await account();
    const cash = await account();
    const usd = await account("USD");
    const target = await goal(goalAccount.id);
    await recordTransaction(deps, { type: "opening_balance", accountId: cash.id, amount: "100" });
    const purpose = await setAccountPurpose(deps, { accountId: cash.id, targetType: "goal", targetId: target.id, amount: "10" });
    await expect(updateGoal(deps, { id: target.id, name: target.name, accountId: usd.id, targetCurrencyCode: "USD", targetAmount: "100" })).rejects.toMatchObject({ code: "account_purpose_currency_mismatch" });
    await expect(updateAccount(deps, { id: cash.id, name: cash.name, classification: "asset", subtype: "cash", currencyCode: "USD" })).rejects.toMatchObject({ code: "account_details_in_use" });
    await archiveAccount(deps, { id: cash.id });
    await expect(removeAccountPurpose(deps, { accountId: cash.id, id: purpose.id })).resolves.toEqual(purpose);
  });
});

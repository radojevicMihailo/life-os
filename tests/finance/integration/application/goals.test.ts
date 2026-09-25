import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { archiveAccount, createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import { archiveGoal, createGoal, getGoalProgress, updateGoal } from "@/modules/finance/application/goals";
import type { ApplicationDependencies, IdKind } from "@/modules/finance/application/ports";
import { recordTransaction } from "@/modules/finance/application/transactions";
import { seedDatabase } from "@/modules/finance/db/seed";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

function makeDeps(testDb: TestDatabase): ApplicationDependencies {
  let sequence = 0;
  return {
    unitOfWork: { run: (work) => testDb.db.transaction((tx) => work(tx)) } satisfies UnitOfWork,
    ids: { nextId: (kind: IdKind) => `${kind}-${++sequence}` },
    clock: { now: () => new Date("2026-04-15T12:00:00.000Z") },
  };
}

describe("goal application service", () => {
  let deps: ApplicationDependencies;
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
    await seedDatabase(testDb.db);
    deps = makeDeps(testDb);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("requires an active asset account with the same currency", async () => {
    const liability = await createAccount(deps, {
      classification: "liability", currencyCode: "EUR", name: "Card", subtype: "card",
    });
    const archived = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Old cash", subtype: "cash",
    });
    await archiveAccount(deps, { id: archived.id });
    const asset = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Cash", subtype: "cash",
    });

    await expect(createGoal(deps, {
      accountId: liability.id, name: "Card payoff", targetAmount: "100", targetCurrencyCode: "EUR",
    })).rejects.toMatchObject({ code: "goal_account_must_be_asset" });
    await expect(createGoal(deps, {
      accountId: archived.id, name: "Archived", targetAmount: "100", targetCurrencyCode: "EUR",
    })).rejects.toMatchObject({ code: "account_inactive" });
    await expect(createGoal(deps, {
      accountId: asset.id, name: "Wrong currency", targetAmount: "100", targetCurrencyCode: "USD",
    })).rejects.toMatchObject({ code: "goal_currency_mismatch" });

    const rows = await testDb.pool.query<{ count: string }>("select count(*)::text as count from finance_goals");
    expect(rows.rows).toEqual([{ count: "0" }]);
  });

  it("persists goals and derives zero, negative, and over-target native balances", async () => {
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Cash", subtype: "cash",
    });
    const expenses = await createCategory(deps, { classification: "expense", name: "Expenses" });
    const goal = await createGoal(deps, {
      accountId: cash.id, name: "Emergency fund", targetAmount: "100", targetCurrencyCode: "EUR",
    });

    expect(await getGoalProgress(deps, { id: goal.id })).toMatchObject({ balance: "0", percentage: "0" });
    await recordTransaction(deps, { accountId: cash.id, amount: "125", type: "opening_balance" });
    expect(await getGoalProgress(deps, { id: goal.id })).toMatchObject({ balance: "125", percentage: "125" });
    await recordTransaction(deps, {
      accountId: cash.id, amount: "150", categoryId: expenses.id, type: "expense",
    });
    expect(await getGoalProgress(deps, { id: goal.id })).toMatchObject({ balance: "-25", percentage: "-25" });
  });

  it("rolls back a failed goal persistence transaction", async () => {
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Cash", subtype: "cash",
    });
    const duplicateIds: ApplicationDependencies = {
      ...deps,
      ids: { nextId: () => "duplicate-goal" },
    };
    await createGoal(duplicateIds, {
      accountId: cash.id, name: "First", targetAmount: "100", targetCurrencyCode: "EUR",
    });

    await expect(createGoal(duplicateIds, {
      accountId: cash.id, name: "Rejected", targetAmount: "200", targetCurrencyCode: "EUR",
    })).rejects.toMatchObject({ cause: { code: "23505" } });

    const rows = await testDb.pool.query<{ name: string }>("select name from finance_goals order by id");
    expect(rows.rows).toEqual([{ name: "First" }]);
  });

  it("edits and archives a goal while preserving the historical row", async () => {
    const first = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Cash", subtype: "cash",
    });
    const second = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Savings", subtype: "bank",
    });
    const goal = await createGoal(deps, {
      accountId: first.id, name: "Emergency", targetAmount: "100", targetCurrencyCode: "EUR",
    });

    await expect(updateGoal(deps, {
      id: goal.id,
      accountId: second.id,
      name: "Emergency reserve",
      targetAmount: "250",
      targetCurrencyCode: "EUR",
    })).resolves.toMatchObject({
      id: goal.id,
      accountId: second.id,
      name: "Emergency reserve",
      targetAmount: "250.000000000000000000",
      isActive: true,
    });
    await expect(archiveGoal(deps, { id: goal.id })).resolves.toMatchObject({
      id: goal.id,
      isActive: false,
    });

    await expect(testDb.pool.query(
      "select name, is_active, archived_at is not null archived from finance_goals where id = $1",
      [goal.id],
    )).resolves.toMatchObject({
      rows: [{ name: "Emergency reserve", is_active: false, archived: true }],
    });
  });

  it("blocks account archival while an active goal depends on it", async () => {
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Goal cash", subtype: "cash",
    });
    const goal = await createGoal(deps, {
      accountId: cash.id, name: "Protected goal", targetAmount: "100", targetCurrencyCode: "EUR",
    });

    await expect(archiveAccount(deps, { id: cash.id }))
      .rejects.toMatchObject({ code: "account_has_active_goals" });
    await expect(testDb.pool.query("select is_active from finance_accounts where id = $1", [cash.id]))
      .resolves.toMatchObject({ rows: [{ is_active: true }] });

    await archiveGoal(deps, { id: goal.id });
    await expect(archiveAccount(deps, { id: cash.id }))
      .resolves.toMatchObject({ isActive: false });
    await expect(testDb.pool.query("select count(*)::text as count from finance_goals where id = $1", [goal.id]))
      .resolves.toMatchObject({ rows: [{ count: "1" }] });
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { setBudgetLimit, recomputeBudgetSeries } from "@/modules/finance/application/budgets";
import { createCategory } from "@/modules/finance/application/categories";
import {
  correctTransaction,
  recordTransaction,
} from "@/modules/finance/application/transactions";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { seedDatabase } from "@/modules/finance/db/seed";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

function makeDeps(testDb: TestDatabase): ApplicationDependencies {
  let sequence = 0;

  return {
    unitOfWork: {
      run: (work) => testDb.db.transaction((tx) => work(tx)),
    } satisfies UnitOfWork,
    ids: {
      nextId(kind: IdKind) {
        sequence += 1;
        return `${kind}-${sequence}`;
      },
    },
    clock: { now: () => new Date("2026-04-15T12:00:00.000Z") },
  };
}

async function storedPeriods(testDb: TestDatabase, categoryId: string) {
  const result = await testDb.pool.query<{
    carry_in_amount: string;
    limit_amount: string;
    month: string;
    remaining_amount: string;
    spending_amount: string;
  }>(
    `select month::text, limit_amount::text, carry_in_amount::text,
            spending_amount::text, remaining_amount::text
       from finance_budget_periods
      where category_id = $1
      order by month`,
    [categoryId],
  );

  return result.rows.map((row) => ({
    carryIn: row.carry_in_amount,
    limit: row.limit_amount,
    month: row.month,
    remaining: row.remaining_amount,
    spending: row.spending_amount,
  }));
}

describe("budget application service", () => {
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

  it("rejects inactive catalog currencies for a budget limit", async () => {
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Groceries",
    });

    await expect(
      setBudgetLimit(deps, {
        amount: "100",
        categoryId: groceries.id,
        currencyCode: "CHF",
        month: "2026-03",
      }),
    ).rejects.toMatchObject({ name: "ApplicationError", code: "currency_not_found" });
  });

  it("does not allow an existing budget series to change currency", async () => {
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Groceries",
    });

    await setBudgetLimit(deps, {
      amount: "100",
      categoryId: groceries.id,
      currencyCode: "EUR",
      month: "2026-03",
    });

    await expect(
      setBudgetLimit(deps, {
        amount: "100",
        categoryId: groceries.id,
        currencyCode: "USD",
        month: "2026-03",
      }),
    ).rejects.toMatchObject({
      name: "ApplicationError",
      code: "budget_currency_mismatch",
    });

    const result = await testDb.pool.query<{ currency_code: string }>(
      `select currency_code from finance_budget_limits where category_id = $1`,
      [groceries.id],
    );
    expect(result.rows).toEqual([{ currency_code: "EUR" }]);
  });

  it("starts a new series at its first limit rather than carrying earlier spending", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Cash",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Groceries",
    });

    await recordTransaction(deps, {
      accountId: cash.id,
      amount: "80",
      categoryId: groceries.id,
      occurredAt: new Date("2026-02-10T12:00:00.000Z"),
      type: "expense",
    });
    await setBudgetLimit(deps, {
      amount: "100",
      categoryId: groceries.id,
      currencyCode: "EUR",
      month: "2026-03",
    });

    expect(await storedPeriods(testDb, groceries.id)).toEqual([
      {
        carryIn: "0.000000000000000000",
        limit: "100.000000000000000000",
        month: "2026-03-01",
        remaining: "100.000000000000000000",
        spending: "0.000000000000000000",
      },
      {
        carryIn: "100.000000000000000000",
        limit: "0.000000000000000000",
        month: "2026-04-01",
        remaining: "100.000000000000000000",
        spending: "0.000000000000000000",
      },
    ]);
  });

  it("recomputes both original and replacement categories after a correction", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Cash",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Groceries",
    });
    const transport = await createCategory(deps, {
      classification: "expense",
      name: "Transport",
    });
    await setBudgetLimit(deps, {
      amount: "100",
      categoryId: groceries.id,
      currencyCode: "EUR",
      month: "2026-03",
    });
    await setBudgetLimit(deps, {
      amount: "100",
      categoryId: transport.id,
      currencyCode: "EUR",
      month: "2026-03",
    });
    const original = await recordTransaction(deps, {
      accountId: cash.id,
      amount: "80",
      categoryId: groceries.id,
      occurredAt: new Date("2026-03-10T12:00:00.000Z"),
      type: "expense",
    });

    await correctTransaction(deps, {
      originalId: original.id,
      occurredAt: new Date("2026-03-10T12:00:00.000Z"),
      replacement: {
        accountId: cash.id,
        amount: "50",
        categoryId: transport.id,
        occurredAt: new Date("2026-03-10T12:00:00.000Z"),
        type: "expense",
      },
    });

    expect((await storedPeriods(testDb, groceries.id))[0]).toMatchObject({
      remaining: "100.000000000000000000",
      spending: "0.000000000000000000",
    });
    expect((await storedPeriods(testDb, transport.id))[0]).toMatchObject({
      remaining: "50.000000000000000000",
      spending: "50.000000000000000000",
    });
  });

  it("rebuilds later carry values after a backdated expense and includes categorized transfer fees", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Cash",
      subtype: "cash",
    });
    const savings = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Savings",
      subtype: "bank",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Groceries",
    });

    await setBudgetLimit(deps, {
      amount: "100",
      categoryId: groceries.id,
      currencyCode: "EUR",
      month: "2026-03",
    });
    await recordTransaction(deps, {
      accountId: cash.id,
      amount: "80",
      categoryId: groceries.id,
      occurredAt: new Date("2026-03-31T21:30:00.000Z"),
      type: "expense",
    });
    await recordTransaction(deps, {
      amount: "10",
      categoryId: groceries.id,
      occurredAt: new Date("2026-04-03T12:00:00.000Z"),
      type: "expense",
      accountId: cash.id,
    });
    await recordTransaction(deps, {
      fromAccountId: cash.id,
      toAccountId: savings.id,
      amount: "1",
      fee: { amount: "5", categoryId: groceries.id },
      occurredAt: new Date("2026-03-20T12:00:00.000Z"),
      type: "transfer",
    });

    expect(await storedPeriods(testDb, groceries.id)).toEqual([
      {
        carryIn: "0.000000000000000000",
        limit: "100.000000000000000000",
        month: "2026-03-01",
        remaining: "15.000000000000000000",
        spending: "85.000000000000000000",
      },
      {
        carryIn: "15.000000000000000000",
        limit: "0.000000000000000000",
        month: "2026-04-01",
        remaining: "5.000000000000000000",
        spending: "10.000000000000000000",
      },
    ]);

    await recordTransaction(deps, {
      accountId: cash.id,
      amount: "10",
      categoryId: groceries.id,
      occurredAt: new Date("2026-03-01T12:00:00.000Z"),
      type: "expense",
    });
    const rebuilt = await storedPeriods(testDb, groceries.id);

    await recomputeBudgetSeries(deps, {
      categoryId: groceries.id,
      fromMonth: "2026-03",
    });

    expect(await storedPeriods(testDb, groceries.id)).toEqual(rebuilt);
    expect(rebuilt[1]).toMatchObject({ carryIn: "5.000000000000000000", remaining: "-5.000000000000000000" });
  });
});

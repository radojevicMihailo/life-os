import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import { recordTransaction } from "@/modules/finance/application/transactions";
import { listTransactions } from "@/modules/finance/read-models/transactions";
import { seedDatabase } from "@/modules/finance/db/seed";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

function makeDependencies(testDb: TestDatabase): ApplicationDependencies {
  let sequence = 0;

  return {
    unitOfWork: {
      run: (work, config) => testDb.db.transaction((tx) => work(tx), config),
    } satisfies UnitOfWork,
    ids: {
      nextId: (kind: IdKind) => `${kind}-${++sequence}`,
    },
    clock: {
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    },
  };
}

describe("transactions read model", () => {
  let testDb: TestDatabase;
  let dependencies: ApplicationDependencies;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    await testDb.pool.query(
      "truncate table finance_provider_refresh_runs, finance_journal_transactions, finance_investment_accounts, finance_currencies cascade",
    );
    await seedDatabase(testDb.db);
    dependencies = makeDependencies(testDb);
  });

  afterAll(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("filters posted transactions and exposes only user-facing native amounts", async () => {
    const cash = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Novčanik",
      subtype: "cash",
    });
    const bank = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Banka",
      subtype: "bank",
    });
    const savings = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Štednja",
      subtype: "savings",
    });
    const dollars = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "USD",
      name: "Dolari",
      subtype: "cash",
    });
    const receivable = await createAccount(dependencies, {
      classification: "receivable",
      currencyCode: "EUR",
      name: "Ana",
      subtype: "personal_receivable",
    });
    const groceries = await createCategory(dependencies, {
      classification: "expense",
      name: "Namirnice",
    });
    const transport = await createCategory(dependencies, {
      classification: "expense",
      name: "Prevoz",
    });
    const salary = await createCategory(dependencies, {
      classification: "income",
      name: "Plata",
    });

    const income = await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "100.00",
      categoryId: salary.id,
      occurredAt: new Date("2026-08-01T08:00:00.000Z"),
      source: "shortcut",
      type: "income",
    });
    const expense = await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "30.00",
      categoryId: groceries.id,
      description: "Pijaca",
      occurredAt: new Date("2026-08-15T08:00:00.000Z"),
      source: "web",
      type: "expense",
    });
    const priorExpense = await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "20.00",
      categoryId: groceries.id,
      occurredAt: new Date("2026-07-15T08:00:00.000Z"),
      source: "web",
      type: "expense",
    });
    const otherAccountExpense = await recordTransaction(dependencies, {
      accountId: bank.id,
      amount: "9.00",
      categoryId: groceries.id,
      occurredAt: new Date("2026-08-16T08:00:00.000Z"),
      source: "web",
      type: "expense",
    });
    const otherCategoryExpense = await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "8.00",
      categoryId: transport.id,
      occurredAt: new Date("2026-08-17T08:00:00.000Z"),
      source: "web",
      type: "expense",
    });
    const shortcutExpense = await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "7.00",
      categoryId: groceries.id,
      occurredAt: new Date("2026-08-18T08:00:00.000Z"),
      source: "shortcut",
      type: "expense",
    });
    const sameCurrencyTransfer = await recordTransaction(dependencies, {
      amount: "5.00",
      fromAccountId: cash.id,
      occurredAt: new Date("2026-08-19T08:00:00.000Z"),
      source: "web",
      toAccountId: savings.id,
      type: "transfer",
    });
    const foreignExchange = await recordTransaction(dependencies, {
      fromAccountId: cash.id,
      fromAmount: "4.00",
      occurredAt: new Date("2026-08-20T08:00:00.000Z"),
      source: "web",
      toAccountId: dollars.id,
      toAmount: "5.00",
      type: "transfer",
    });
    const opening = await recordTransaction(dependencies, {
      accountId: savings.id,
      amount: "50.00",
      source: "web",
      type: "opening_balance",
    });
    const loan = await recordTransaction(dependencies, {
      amount: "6.00",
      counterparty: "Ana Petrović",
      fromAccountId: cash.id,
      receivableAccountId: receivable.id,
      source: "web",
      type: "receivable_out",
    });
    const repayment = await recordTransaction(dependencies, {
      amount: "2.00",
      counterparty: "Ana Petrović",
      receivableAccountId: receivable.id,
      source: "web",
      toAccountId: cash.id,
      type: "receivable_repayment",
    });

    await expect(
      listTransactions(dependencies, { accountId: bank.id }),
    ).resolves.toMatchObject({ items: [{ id: otherAccountExpense.id }] });
    await expect(
      listTransactions(dependencies, { categoryId: transport.id }),
    ).resolves.toMatchObject({ items: [{ id: otherCategoryExpense.id }] });
    await expect(
      listTransactions(dependencies, { source: "shortcut" }),
    ).resolves.toMatchObject({
      items: [
        { id: shortcutExpense.id },
        {
          correctionDraft: {
            accountId: cash.id,
            amount: "100",
            categoryId: salary.id,
            operation: "income",
          },
          id: income.id,
        },
      ],
    });
    await expect(
      listTransactions(dependencies, { type: "income" }),
    ).resolves.toMatchObject({ items: [{ id: income.id }] });
    await expect(
      listTransactions(dependencies, { type: "transfer" }),
    ).resolves.toMatchObject({
      items: [
        {
          correctionDraft: {
            amount: "5",
            fromAccountId: cash.id,
            operation: "transfer",
            toAccountId: savings.id,
          },
          id: sameCurrencyTransfer.id,
          nativeAmounts: [
            { accountName: "Novčanik", amount: "-5", currencyCode: "EUR" },
            { accountName: "Štednja", amount: "5", currencyCode: "EUR" },
          ],
        },
      ],
    });
    await expect(
      listTransactions(dependencies, { type: "foreign_exchange" }),
    ).resolves.toMatchObject({
      items: [
        {
          correctionDraft: {
            effectiveRate: "1.25",
            fromAccountId: cash.id,
            fromAmount: "4",
            operation: "transfer",
            toAccountId: dollars.id,
            toAmount: "5",
          },
          id: foreignExchange.id,
          nativeAmounts: [
            { accountName: "Novčanik", amount: "-4", currencyCode: "EUR" },
            { accountName: "Dolari", amount: "5", currencyCode: "USD" },
          ],
        },
      ],
    });
    await expect(listTransactions(dependencies, { type: "opening_balance" }))
      .resolves.toMatchObject({ items: [{ id: opening.id, correctionDraft: {
        accountId: savings.id,
        amount: "50",
        operation: "opening_balance",
      } }] });
    await expect(listTransactions(dependencies, { type: "receivable_out" }))
      .resolves.toMatchObject({ items: [{ id: loan.id, correctionDraft: {
        amount: "6",
        counterparty: "Ana Petrović",
        fromAccountId: cash.id,
        operation: "receivable_out",
        receivableAccountId: receivable.id,
      } }] });
    await expect(listTransactions(dependencies, { type: "receivable_repayment" }))
      .resolves.toMatchObject({ items: [{ id: repayment.id, correctionDraft: {
        amount: "2",
        counterparty: "Ana Petrović",
        operation: "receivable_repayment",
        receivableAccountId: receivable.id,
        toAccountId: cash.id,
      } }] });
    await expect(
      listTransactions(dependencies, {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      }),
    ).resolves.not.toMatchObject({
      items: expect.arrayContaining([{ id: priorExpense.id }]),
    });

    const result = await listTransactions(dependencies, {
      accountId: cash.id,
      categoryId: groceries.id,
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      limit: 20,
      source: "web",
      type: "expense",
    });

    expect(result).toMatchObject({
      hasMore: false,
      filters: {
        accountId: cash.id,
        categoryId: groceries.id,
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        source: "web",
        type: "expense",
      },
    });
    expect(result.items).toEqual([
      {
        accountNames: ["Novčanik"],
        categoryNames: ["Namirnice"],
        corrected: false,
        correctionDraft: {
          accountId: cash.id,
          amount: "30",
          categoryId: groceries.id,
          operation: "expense",
        },
        description: "Pijaca",
        id: expense.id,
        nativeAmounts: [
          { accountName: "Novčanik", amount: "-30", currencyCode: "EUR" },
        ],
        occurredAt: new Date("2026-08-15T08:00:00.000Z"),
        source: "web",
        type: "expense",
      },
    ]);
  });
});

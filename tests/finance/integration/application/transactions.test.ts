import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  archiveAccount,
  createAccount,
} from "@/modules/finance/application/accounts";
import {
  archiveCategory,
  createCategory,
} from "@/modules/finance/application/categories";
import {
  getNativeBalances,
  recordTransaction,
} from "@/modules/finance/application/transactions";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import { isDomainError } from "@/modules/finance/domain/errors";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { seedDatabase } from "@/modules/finance/db/seed";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

type MoneyOperation =
  | "expense"
  | "income"
  | "transfer"
  | "receivable_out"
  | "receivable_repayment";

function makeDeps(
  testDb: TestDatabase,
  ids?: string[],
): ApplicationDependencies {
  let nextGeneratedId = 0;
  const explicitIds = ids ? [...ids] : undefined;

  return {
    unitOfWork: {
      run: (work) => testDb.db.transaction((tx) => work(tx)),
    } satisfies UnitOfWork,
    ids: {
      nextId(kind: IdKind) {
        const explicit = explicitIds?.shift();

        if (explicit) {
          return explicit;
        }

        nextGeneratedId += 1;
        return `${kind}-${nextGeneratedId}`;
      },
    },
    clock: {
      now: () => new Date("2026-08-22T12:00:00.000Z"),
    },
  };
}

async function postingsSumByCurrency(testDb: TestDatabase, transactionId: string) {
  const result = await testDb.pool.query<{
    currency_code: string;
    total: string;
  }>(
    `select currency_code, sum(amount)::text as total
       from finance_journal_postings
      where transaction_id = $1
      group by currency_code
      order by currency_code`,
    [transactionId],
  );

  return result.rows.map((row) => ({
    currencyCode: row.currency_code,
    total: new Decimal(row.total).toFixed(18),
  }));
}

async function postingRows(testDb: TestDatabase, transactionId: string) {
  const result = await testDb.pool.query<{
    account_id: string;
    amount: string;
    category_id: string | null;
    counterparty: string | null;
    currency_code: string;
  }>(
    `select account_id, amount::text, category_id, counterparty, currency_code
       from finance_journal_postings
      where transaction_id = $1
      order by account_id, amount`,
    [transactionId],
  );

  return result.rows.map((row) => ({
    accountId: row.account_id,
    amount: new Decimal(row.amount).toFixed(2),
    categoryId: row.category_id,
    counterparty: row.counterparty,
    currencyCode: row.currency_code,
  }));
}

async function countRows(testDb: TestDatabase, table: string, transactionId: string) {
  const result = await testDb.pool.query<{ count: string }>(
    `select count(*)::text from ${table} where transaction_id = $1`,
    [transactionId],
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function journalTransactionCount(testDb: TestDatabase) {
  const result = await testDb.pool.query<{ count: string }>(
    `select count(*)::text from finance_journal_transactions`,
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function receivableCounterpartyRows(
  testDb: TestDatabase,
  transactionIds: string[],
  receivableAccountId: string,
) {
  const result = await testDb.pool.query<{
    amount: string;
    counterparty: string | null;
    transaction_id: string;
  }>(
    `select transaction_id, amount::text, counterparty
       from finance_journal_postings
      where transaction_id = any($1::text[])
        and account_id = $2
      order by transaction_id`,
    [transactionIds, receivableAccountId],
  );

  return result.rows.map((row) => ({
    amount: new Decimal(row.amount).toFixed(2),
    counterparty: row.counterparty,
    transactionId: row.transaction_id,
  }));
}

async function expectApplicationCode(
  action: Promise<unknown>,
  code: string,
) {
  await expect(action).rejects.toMatchObject({ name: "ApplicationError", code });
}

describe("transaction application service", () => {
  let testDb: TestDatabase;
  let deps: ApplicationDependencies;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
    await seedDatabase(testDb.db);
    deps = makeDeps(testDb);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("creates and archives accounts without hard deleting referenced rows", async () => {
    const account = await createAccount(deps, {
      classification: "asset",
      currencyCode: "CHF",
      name: "Swiss cash",
      subtype: "cash",
    });

    expect(account).toMatchObject({
      classification: "asset",
      currencyCode: "CHF",
      isActive: true,
      name: "Swiss cash",
    });

    const currency = await testDb.pool.query<{
      activated_at: Date | null;
      is_active: boolean;
    }>(`select is_active, activated_at from finance_currencies where code = 'CHF'`);
    expect(currency.rows[0]).toMatchObject({
      activated_at: new Date("2026-08-22T12:00:00.000Z"),
      is_active: true,
    });

    await expectApplicationCode(
      createAccount(deps, {
        classification: "equity",
        currencyCode: "EUR",
        name: "Manual equity",
        subtype: "manual",
      }),
      "account_classification_unsupported",
    );

    const archived = await archiveAccount(deps, { id: account.id });
    expect(archived).toMatchObject({ id: account.id, isActive: false });

    const stored = await testDb.pool.query<{
      archived_at: Date | null;
      count: string;
      is_active: boolean;
    }>(
      `select count(*) over ()::text as count, is_active, archived_at
         from finance_accounts
        where id = $1`,
      [account.id],
    );

    expect(stored.rows[0]).toMatchObject({
      archived_at: new Date("2026-08-22T12:00:00.000Z"),
      count: "1",
      is_active: false,
    });
  });

  it("creates and archives categories and rejects archived categories for new postings", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Cash EUR",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Groceries",
    });

    await archiveCategory(deps, { id: groceries.id });

    await expectApplicationCode(
      recordTransaction(deps, {
        accountId: cash.id,
        amount: "10.00",
        categoryId: groceries.id,
        description: "Archived category purchase",
        type: "expense",
      }),
      "category_inactive",
    );
  });

  it("rejects archival of system-owned accounts and categories", async () => {
    await testDb.pool.query(
      `insert into finance_categories (id, name, classification, is_system)
       values ('system-test-category', 'System test category', 'expense', true)`,
    );

    await expectApplicationCode(
      archiveAccount(deps, { id: "system-expense" }),
      "account_system_archive_forbidden",
    );
    await expectApplicationCode(
      archiveCategory(deps, { id: "system-test-category" }),
      "category_system_archive_forbidden",
    );
    await expect(testDb.pool.query(
      "select is_active from finance_accounts where id = 'system-expense'",
    )).resolves.toMatchObject({ rows: [{ is_active: true }] });
    await expect(testDb.pool.query(
      "select is_active from finance_categories where id = 'system-test-category'",
    )).resolves.toMatchObject({ rows: [{ is_active: true }] });
    await expect(getMutationOptions(deps)).resolves.toMatchObject({
      categories: expect.not.arrayContaining([
        expect.objectContaining({ id: "system-test-category" }),
      ]),
    });
  });

  it("posts active catalog CHF transactions with catalog precision and exact native balances", async () => {
    const swissCash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "CHF",
      name: "Swiss cash for posting",
      subtype: "cash",
    });
    const salary = await createCategory(deps, {
      classification: "income",
      name: "Swiss salary",
    });

    const result = await recordTransaction(deps, {
      accountId: swissCash.id,
      amount: "100.50",
      categoryId: salary.id,
      description: "Swiss income",
      type: "income",
    });

    expect(result.type).toBe("income");
    expect(await postingsSumByCurrency(testDb, result.id)).toEqual([
      { currencyCode: "CHF", total: "0.000000000000000000" },
    ]);
    await expect(
      getNativeBalances(deps, { accountIds: [swissCash.id] }),
    ).resolves.toEqual([
      expect.objectContaining({
        accountId: swissCash.id,
        currencyCode: "CHF",
        displayBalance: "100.50",
        internalBalance: "100.50",
      }),
    ]);

    const beforeInvalid = await journalTransactionCount(testDb);
    await expect(
      recordTransaction(deps, {
        accountId: swissCash.id,
        amount: "1.001",
        categoryId: salary.id,
        description: "Invalid Swiss income",
        type: "income",
      }),
    ).rejects.toSatisfy((error) =>
      isDomainError(error, "money_precision_exceeded"),
    );
    expect(await journalTransactionCount(testDb)).toBe(beforeInvalid);
  });

  it.each([
    "expense",
    "income",
    "transfer",
    "receivable_out",
    "receivable_repayment",
  ] as const)(
    "posts %s atomically and balances every currency",
    async (operation: MoneyOperation) => {
      const cash = await createAccount(deps, {
        classification: "asset",
        currencyCode: "EUR",
        name: "Cash EUR",
        subtype: "cash",
      });
      const savings = await createAccount(deps, {
        classification: "asset",
        currencyCode: "EUR",
        name: "Savings EUR",
        subtype: "bank",
      });
      const receivable = await createAccount(deps, {
        classification: "receivable",
        currencyCode: "EUR",
        name: "Loans EUR",
        subtype: "personal_receivable",
      });
      const expenseCategory = await createCategory(deps, {
        classification: "expense",
        name: "Groceries",
      });
      const incomeCategory = await createCategory(deps, {
        classification: "income",
        name: "Salary",
      });

      const result =
        operation === "expense"
          ? await recordTransaction(deps, {
              accountId: cash.id,
              amount: "12.34",
              categoryId: expenseCategory.id,
              description: "Groceries",
              type: "expense",
            })
          : operation === "income"
            ? await recordTransaction(deps, {
                accountId: cash.id,
                amount: "100.00",
                categoryId: incomeCategory.id,
                description: "Salary",
                type: "income",
              })
            : operation === "transfer"
              ? await recordTransaction(deps, {
                  amount: "20.00",
                  description: "Move to savings",
                  fromAccountId: cash.id,
                  toAccountId: savings.id,
                  type: "transfer",
                })
              : operation === "receivable_out"
                ? await recordTransaction(deps, {
                    amount: "30.00",
                    counterparty: "Ana",
                    description: "Loan to Ana",
                    fromAccountId: cash.id,
                    receivableAccountId: receivable.id,
                    type: "receivable_out",
                  })
                : await recordTransaction(deps, {
                    amount: "15.00",
                    counterparty: "Ana",
                    description: "Ana repayment",
                    receivableAccountId: receivable.id,
                    toAccountId: cash.id,
                    type: "receivable_repayment",
                  });

      expect(result.type).toBe(operation);
      expect(await postingsSumByCurrency(testDb, result.id)).toEqual([
        { currencyCode: "EUR", total: "0.000000000000000000" },
      ]);
      expect(result.affectedBalances.length).toBeGreaterThan(0);
    },
  );

  it("posts FX transfers with both native amounts through balanced internal FX legs", async () => {
    const euroCash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Euro cash",
      subtype: "cash",
    });
    const usdCash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "USD",
      name: "USD cash",
      subtype: "cash",
    });

    const result = await recordTransaction(deps, {
      description: "Buy USD",
      fromAccountId: euroCash.id,
      fromAmount: "100.00",
      toAccountId: usdCash.id,
      toAmount: "110.00",
      type: "transfer",
    });

    expect(result.type).toBe("foreign_exchange");
    expect(result.foreignExchange).toEqual({
      effectiveRate: "1.100000000000000000",
      fromAmount: "100.00",
      fromCurrencyCode: "EUR",
      toAmount: "110.00",
      toCurrencyCode: "USD",
    });
    expect(await postingsSumByCurrency(testDb, result.id)).toEqual([
      { currencyCode: "EUR", total: "0.000000000000000000" },
      { currencyCode: "USD", total: "0.000000000000000000" },
    ]);

    const postings = await postingRows(testDb, result.id);
    expect(postings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: euroCash.id,
          amount: "-100.00",
          currencyCode: "EUR",
        }),
        expect.objectContaining({
          accountId: usdCash.id,
          amount: "110.00",
          currencyCode: "USD",
        }),
      ]),
    );

    const fxAccounts = await testDb.pool.query<{
      classification: string;
      currency_code: string;
      subtype: string;
    }>(
      `select distinct a.classification, a.currency_code, a.subtype
         from finance_journal_postings p
         join finance_accounts a on a.id = p.account_id
        where p.transaction_id = $1
          and a.is_system
          and a.subtype = 'foreign_exchange'
        order by a.currency_code`,
      [result.id],
    );

    expect(fxAccounts.rows).toEqual([
      {
        classification: "equity",
        currency_code: "EUR",
        subtype: "foreign_exchange",
      },
      {
        classification: "equity",
        currency_code: "USD",
        subtype: "foreign_exchange",
      },
    ]);
  });

  it("derives the target native amount from an explicit FX effective rate", async () => {
    const euroCash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Euro cash",
      subtype: "cash",
    });
    const usdCash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "USD",
      name: "USD cash",
      subtype: "cash",
    });

    const result = await recordTransaction(deps, {
      effectiveRate: "1.200000000000000000",
      fromAccountId: euroCash.id,
      fromAmount: "50.00",
      toAccountId: usdCash.id,
      type: "transfer",
    });

    expect(result.foreignExchange).toMatchObject({
      effectiveRate: "1.200000000000000000",
      toAmount: "60.00",
    });
    expect(await postingRows(testDb, result.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: usdCash.id,
          amount: "60.00",
          currencyCode: "USD",
        }),
      ]),
    );
  });

  it("posts credit-card purchases and payments with liability display balances", async () => {
    const checking = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Checking",
      subtype: "bank",
    });
    const card = await createAccount(deps, {
      classification: "liability",
      currencyCode: "EUR",
      name: "Credit card",
      subtype: "credit_card",
    });
    const dining = await createCategory(deps, {
      classification: "expense",
      name: "Dining",
    });

    await recordTransaction(deps, {
      accountId: card.id,
      amount: "100.00",
      categoryId: dining.id,
      description: "Dinner on card",
      type: "expense",
    });
    const payment = await recordTransaction(deps, {
      amount: "40.00",
      description: "Card payment",
      fromAccountId: checking.id,
      toAccountId: card.id,
      type: "transfer",
    });

    expect(payment.affectedBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: checking.id,
          displayBalance: "-40.00",
          internalBalance: "-40.00",
        }),
        expect.objectContaining({
          accountId: card.id,
          displayBalance: "60.00",
          internalBalance: "-60.00",
        }),
      ]),
    );
  });

  it("posts opening balances against system equity and returns native balances", async () => {
    const checking = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Opening account",
      subtype: "bank",
    });

    const result = await recordTransaction(deps, {
      accountId: checking.id,
      amount: "250.00",
      description: "Initial balance",
      type: "opening_balance",
    });

    expect(result.type).toBe("opening_balance");
    expect(await postingsSumByCurrency(testDb, result.id)).toEqual([
      { currencyCode: "EUR", total: "0.000000000000000000" },
    ]);

    await expect(getNativeBalances(deps, { accountIds: [checking.id] })).resolves.toEqual([
      expect.objectContaining({
        accountId: checking.id,
        currencyCode: "EUR",
        displayBalance: "250.00",
        internalBalance: "250.00",
      }),
    ]);
  });

  it("posts same-currency transfer fees in the source currency", async () => {
    const checking = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Fee checking",
      subtype: "bank",
    });
    const brokerage = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Fee brokerage",
      subtype: "brokerage_cash",
    });
    const fees = await createCategory(deps, {
      classification: "expense",
      name: "Bank fees",
    });

    const result = await recordTransaction(deps, {
      amount: "100.00",
      fee: {
        amount: "2.50",
        categoryId: fees.id,
      },
      fromAccountId: checking.id,
      toAccountId: brokerage.id,
      type: "transfer",
    });

    expect(await postingsSumByCurrency(testDb, result.id)).toEqual([
      { currencyCode: "EUR", total: "0.000000000000000000" },
    ]);
    expect(await postingRows(testDb, result.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: checking.id, amount: "-102.50" }),
        expect.objectContaining({ accountId: brokerage.id, amount: "100.00" }),
      ]),
    );
  });

  it("requires counterparties for receivable loans and repayments without writing journals", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Cash for receivable",
      subtype: "cash",
    });
    const receivable = await createAccount(deps, {
      classification: "receivable",
      currencyCode: "EUR",
      name: "Receivable no counterparty",
      subtype: "personal_receivable",
    });

    const beforeInvalid = await journalTransactionCount(testDb);
    await expect(
      recordTransaction(deps, {
        amount: "20.00",
        fromAccountId: cash.id,
        receivableAccountId: receivable.id,
        type: "receivable_out",
      }),
    ).rejects.toSatisfy((error) =>
      isDomainError(error, "journal_counterparty_required"),
    );
    await expect(
      recordTransaction(deps, {
        amount: "10.00",
        receivableAccountId: receivable.id,
        toAccountId: cash.id,
        type: "receivable_repayment",
      }),
    ).rejects.toSatisfy((error) =>
      isDomainError(error, "journal_counterparty_required"),
    );
    expect(await journalTransactionCount(testDb)).toBe(beforeInvalid);
  });

  it("retains counterparties on receivable loan and repayment postings", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Cash for retained receivable",
      subtype: "cash",
    });
    const receivable = await createAccount(deps, {
      classification: "receivable",
      currencyCode: "EUR",
      name: "Receivable retained counterparty",
      subtype: "personal_receivable",
    });

    const loan = await recordTransaction(deps, {
      amount: "30.00",
      counterparty: "Ana",
      fromAccountId: cash.id,
      receivableAccountId: receivable.id,
      type: "receivable_out",
    });
    const repayment = await recordTransaction(deps, {
      amount: "12.50",
      counterparty: "Ana",
      receivableAccountId: receivable.id,
      toAccountId: cash.id,
      type: "receivable_repayment",
    });

    expect(
      await receivableCounterpartyRows(testDb, [loan.id, repayment.id], receivable.id),
    ).toEqual([
      {
        amount: "30.00",
        counterparty: "Ana",
        transactionId: loan.id,
      },
      {
        amount: "-12.50",
        counterparty: "Ana",
        transactionId: repayment.id,
      },
    ]);
  });

  it("revalidates archived accounts inside the transaction before posting", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Archived cash",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Archived account groceries",
    });

    await archiveAccount(deps, { id: cash.id });

    await expectApplicationCode(
      recordTransaction(deps, {
        accountId: cash.id,
        amount: "10.00",
        categoryId: groceries.id,
        type: "expense",
      }),
      "account_inactive",
    );
  });

  it("rolls back the journal header when the postings write fails", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Rollback cash",
      subtype: "cash",
    });
    const salary = await createCategory(deps, {
      classification: "income",
      name: "Rollback salary",
    });
    const rollbackDeps = makeDeps(testDb, [
      "rollback-tx",
      "duplicate-posting",
      "duplicate-posting",
    ]);

    await expect(
      recordTransaction(rollbackDeps, {
        accountId: cash.id,
        amount: "10.00",
        categoryId: salary.id,
        type: "income",
      }),
    ).rejects.toThrow();

    const headers = await testDb.pool.query<{ count: string }>(
      `select count(*)::text from finance_journal_transactions where id = 'rollback-tx'`,
    );
    expect(headers.rows[0]?.count).toBe("0");
    expect(await countRows(testDb, "finance_journal_postings", "rollback-tx")).toBe(0);
  });
});

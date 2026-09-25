import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import {
  correctTransaction,
  getNativeBalances,
  recordTransaction,
} from "@/modules/finance/application/transactions";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { seedDatabase } from "@/modules/finance/db/seed";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

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

async function originalPostingAmounts(testDb: TestDatabase, transactionId: string) {
  const result = await testDb.pool.query<{
    amount: string;
    classification: string;
  }>(
    `select a.classification, p.amount::text
       from finance_journal_postings p
       join finance_accounts a on a.id = p.account_id
      where p.transaction_id = $1
      order by a.classification`,
    [transactionId],
  );

  return result.rows.map((row) => ({
    amount: new Decimal(row.amount).toFixed(2),
    classification: row.classification,
  }));
}

async function expectApplicationCode(
  action: Promise<unknown>,
  code: string,
) {
  await expect(action).rejects.toMatchObject({ name: "ApplicationError", code });
}

describe("transaction correction application service", () => {
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

  it("atomically reverses an immutable original and writes a corrected replacement", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Correction cash",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Correction groceries",
    });
    const original = await recordTransaction(deps, {
      accountId: cash.id,
      amount: "10.00",
      categoryId: groceries.id,
      description: "Original groceries",
      type: "expense",
    });

    const correction = await correctTransaction(deps, {
      description: "Korisnik je ispravio pogrešan iznos",
      occurredAt: new Date("2026-08-23T10:00:00.000Z"),
      originalId: original.id,
      replacement: {
        accountId: cash.id,
        amount: "7.50",
        categoryId: groceries.id,
        description: "Corrected groceries",
        type: "expense",
      },
    });

    expect(correction.originalId).toBe(original.id);
    expect(correction.reversal.type).toBe("correction");
    expect(correction.reversal.correctionOfId).toBe(original.id);
    expect(correction.replacement.type).toBe("expense");
    expect(correction.replacement.correctionOfId).toBe(original.id);

    const headers = await testDb.pool.query<{
      correction_of_id: string | null;
      corrected_by_id: string | null;
      description: string | null;
      id: string;
      status: string;
      type: string;
    }>(
      `select id, type, status, description, correction_of_id, corrected_by_id
         from finance_journal_transactions
        where id = any($1::text[])
        order by id`,
      [[original.id, correction.reversal.id, correction.replacement.id]],
    );

    expect(headers.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          correction_of_id: null,
          corrected_by_id: correction.replacement.id,
          description: "Original groceries",
          id: original.id,
          status: "posted",
          type: "expense",
        }),
        expect.objectContaining({
          correction_of_id: original.id,
          corrected_by_id: null,
          description: "Korisnik je ispravio pogrešan iznos",
          id: correction.reversal.id,
          status: "posted",
          type: "correction",
        }),
        expect.objectContaining({
          correction_of_id: original.id,
          corrected_by_id: null,
          description: "Corrected groceries",
          id: correction.replacement.id,
          status: "posted",
          type: "expense",
        }),
      ]),
    );

    expect(await postingsSumByCurrency(testDb, correction.reversal.id)).toEqual([
      { currencyCode: "EUR", total: "0.000000000000000000" },
    ]);
    expect(await postingsSumByCurrency(testDb, correction.replacement.id)).toEqual([
      { currencyCode: "EUR", total: "0.000000000000000000" },
    ]);
    expect(await originalPostingAmounts(testDb, original.id)).toEqual([
      { amount: "-10.00", classification: "asset" },
      { amount: "10.00", classification: "expense" },
    ]);
    expect(await getNativeBalances(deps, { accountIds: [cash.id] })).toEqual([
      expect.objectContaining({
        accountId: cash.id,
        displayBalance: "-7.50",
        internalBalance: "-7.50",
      }),
    ]);
  });

  it("rejects corrections of reversal journals", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Correction rejection cash",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Correction rejection groceries",
    });
    const original = await recordTransaction(deps, {
      accountId: cash.id,
      amount: "10.00",
      categoryId: groceries.id,
      type: "expense",
    });
    const correction = await correctTransaction(deps, {
      originalId: original.id,
      replacement: {
        accountId: cash.id,
        amount: "9.00",
        categoryId: groceries.id,
        type: "expense",
      },
    });

    await expectApplicationCode(
      correctTransaction(deps, {
        originalId: correction.reversal.id,
        replacement: {
          accountId: cash.id,
          amount: "8.00",
          categoryId: groceries.id,
          type: "expense",
        },
      }),
      "journal_reversal_cannot_be_corrected",
    );
  });

  it("rolls back reversal, replacement, and original backlink when replacement posting insert fails", async () => {
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Atomic correction cash",
      subtype: "cash",
    });
    const groceries = await createCategory(deps, {
      classification: "expense",
      name: "Atomic correction groceries",
    });
    const original = await recordTransaction(deps, {
      accountId: cash.id,
      amount: "10.00",
      categoryId: groceries.id,
      type: "expense",
    });
    const failingDeps = makeDeps(testDb, [
      "reversal-fail",
      "reversal-fail-posting-1",
      "reversal-fail-posting-2",
      "replacement-fail",
      "duplicate-replacement-posting",
      "duplicate-replacement-posting",
    ]);

    await expect(
      correctTransaction(failingDeps, {
        originalId: original.id,
        replacement: {
          accountId: cash.id,
          amount: "7.50",
          categoryId: groceries.id,
          type: "expense",
        },
      }),
    ).rejects.toThrow();

    const originalHeader = await testDb.pool.query<{
      corrected_by_id: string | null;
    }>(
      `select corrected_by_id
         from finance_journal_transactions
        where id = $1`,
      [original.id],
    );
    expect(originalHeader.rows[0]?.corrected_by_id).toBeNull();

    const correctionRows = await testDb.pool.query<{ count: string }>(
      `select count(*)::text
         from finance_journal_transactions
        where id in ('reversal-fail', 'replacement-fail')
           or correction_of_id = $1`,
      [original.id],
    );
    expect(correctionRows.rows[0]?.count).toBe("0");
  });
});

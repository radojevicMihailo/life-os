import { randomUUID } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, it, afterAll } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import { hashOpaqueToken } from "@/modules/finance/auth/token";
import { seedDatabase } from "@/modules/finance/db/seed";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { createPostHandler } from "@/modules/finance/ui/shortcut-route";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

const RAW_TOKEN = "shortcut-token-for-tests";
const TOKEN_PEPPER = "shortcut-pepper-for-tests";

function makeDeps(testDb: TestDatabase): ApplicationDependencies {
  return {
    unitOfWork: {
      run: (work) => testDb.db.transaction((tx) => work(tx)),
    } satisfies UnitOfWork,
    ids: {
      nextId(kind: IdKind) {
        return `${kind}-${randomUUID()}`;
      },
    },
    clock: {
      now: () => new Date("2026-08-22T12:00:00.000Z"),
    },
  };
}

async function resetDatabase(testDb: TestDatabase) {
  const tables = await testDb.pool.query<{ table_name: string }>(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'`,
  );
  const qualifiedNames = tables.rows
    .map(({ table_name: tableName }) => `"public"."${tableName}"`)
    .join(", ");

  await testDb.pool.query(`truncate table ${qualifiedNames} restart identity cascade`);
  await seedDatabase(testDb.db);
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/v1/transactions", () => {
  let testDb: TestDatabase;
  let deps: ApplicationDependencies;
  let handler: ReturnType<typeof createPostHandler>;
  let fixtures: {
    cashId: string;
    expenseCategoryId: string;
    incomeCategoryId: string;
    receivableId: string;
    savingsId: string;
  };

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    await resetDatabase(testDb);
    deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "API cash",
      subtype: "cash",
    });
    const savings = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "API savings",
      subtype: "bank",
    });
    const receivable = await createAccount(deps, {
      classification: "receivable",
      currencyCode: "EUR",
      name: "API receivable",
      subtype: "personal_receivable",
    });
    const expenseCategory = await createCategory(deps, {
      classification: "expense",
      name: "API groceries",
    });
    const incomeCategory = await createCategory(deps, {
      classification: "income",
      name: "API salary",
    });

    fixtures = {
      cashId: cash.id,
      expenseCategoryId: expenseCategory.id,
      incomeCategoryId: incomeCategory.id,
      receivableId: receivable.id,
      savingsId: savings.id,
    };
    const tokenHash = await hashOpaqueToken(RAW_TOKEN, {
      pepper: TOKEN_PEPPER,
    });
    handler = createPostHandler({
      application: deps,
      readTokenHash: async () => tokenHash,
      tokenPepper: TOKEN_PEPPER,
    });
  });

  afterAll(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  function request(
    body: unknown,
    options?: { idempotencyKey?: string; token?: string },
  ) {
    const headers = new Headers({ "Content-Type": "application/json" });

    if (options?.token !== "missing") {
      headers.set("Authorization", `Bearer ${options?.token ?? RAW_TOKEN}`);
    }

    if (options?.idempotencyKey !== "missing") {
      headers.set("Idempotency-Key", options?.idempotencyKey ?? randomUUID());
    }

    return new Request("https://finance.example.com/api/v1/transactions", {
      body: JSON.stringify(body),
      headers,
      method: "POST",
    });
  }

  it.each([
    ["missing", "missing"],
    ["invalid", "wrong-token"],
  ])("rejects %s bearer authentication", async (_case, token) => {
    const response = await handler(
      request({}, { idempotencyKey: "auth-test", token }),
    );

    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({
      error: {
        code: "unauthorized",
        message: "Shortcut token nije ispravan.",
      },
    });
  });

  it("rejects a missing idempotency key", async () => {
    const response = await handler(
      request({}, { idempotencyKey: "missing" }),
    );

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: {
        code: "idempotency_key_required",
        message: "Nedostaje Idempotency-Key zaglavlje.",
      },
    });
  });

  it("returns a stable Serbian validation error", async () => {
    const response = await handler(
      request({
        operation: "expense",
        accountId: fixtures.cashId,
        amount: "12.00",
      }),
    );

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: {
        code: "validation_error",
        message: "Podaci zahteva nisu ispravni.",
      },
    });
  });

  it.each([
    [
      "expense",
      () => ({
        operation: "expense",
        accountId: fixtures.cashId,
        categoryId: fixtures.expenseCategoryId,
        amount: "12.34",
        note: "Ručak",
      }),
    ],
    [
      "income",
      () => ({
        operation: "income",
        accountId: fixtures.cashId,
        categoryId: fixtures.incomeCategoryId,
        amount: "100.00",
      }),
    ],
    [
      "transfer",
      () => ({
        operation: "transfer",
        fromAccountId: fixtures.cashId,
        toAccountId: fixtures.savingsId,
        amount: "20.00",
      }),
    ],
    [
      "receivable_out",
      () => ({
        operation: "receivable_out",
        fromAccountId: fixtures.cashId,
        receivableAccountId: fixtures.receivableId,
        amount: "30.00",
        counterparty: "Ana",
      }),
    ],
    [
      "receivable_repayment",
      () => ({
        operation: "receivable_repayment",
        receivableAccountId: fixtures.receivableId,
        toAccountId: fixtures.cashId,
        amount: "15.00",
        counterparty: "Ana",
      }),
    ],
  ] as const)("records the %s operation", async (operation, body) => {
    const response = await handler(request(body()));
    const responseBody = await json(response);

    expect(response.status).toBe(201);
    expect(responseBody).toMatchObject({
      reportingConversionStale: false,
      transaction: {
        source: "shortcut",
        type: operation,
      },
      transactionId: expect.any(String),
    });
    expect(responseBody.affectedBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ currencyCode: "EUR" }),
      ]),
    );
  });

  it("marks non-EUR reporting conversion stale until a fresh valuation is proven", async () => {
    const usdCash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "USD",
      name: "API USD cash",
      subtype: "cash",
    });
    const response = await handler(
      request({
        operation: "income",
        accountId: usdCash.id,
        categoryId: fixtures.incomeCategoryId,
        amount: "25.00",
      }),
    );

    expect(response.status).toBe(201);
    expect(await json(response)).toMatchObject({
      reportingConversionStale: true,
      affectedBalances: [
        expect.objectContaining({ currencyCode: "USD" }),
      ],
    });
  });

  it("returns the original response for an identical permanent retry", async () => {
    const body = {
      operation: "expense",
      accountId: fixtures.cashId,
      categoryId: fixtures.expenseCategoryId,
      amount: "9.99",
    };
    const first = await handler(request(body, { idempotencyKey: "same-key" }));
    const retry = await handler(
      request(
        { amount: "9.990", categoryId: fixtures.expenseCategoryId, accountId: fixtures.cashId, operation: "expense" },
        { idempotencyKey: "same-key" },
      ),
    );

    expect(retry.status).toBe(201);
    expect(await json(retry)).toEqual(await json(first));

    const counts = await testDb.pool.query<{ idempotency: string; journals: string }>(
      `select
         (select count(*)::text from finance_idempotency_records) as idempotency,
         (select count(*)::text from finance_journal_transactions) as journals`,
    );
    expect(counts.rows[0]).toEqual({ idempotency: "1", journals: "1" });
  });

  it("returns HTTP 409 and writes nothing for a changed payload", async () => {
    const base = {
      operation: "expense",
      accountId: fixtures.cashId,
      categoryId: fixtures.expenseCategoryId,
    };

    await handler(request({ ...base, amount: "10.00" }, { idempotencyKey: "conflict-key" }));
    const conflict = await handler(
      request({ ...base, amount: "11.00" }, { idempotencyKey: "conflict-key" }),
    );

    expect(conflict.status).toBe(409);
    expect(await json(conflict)).toEqual({
      error: {
        code: "idempotency_conflict",
        message: "Idempotency-Key je već upotrebljen za drugačiji zahtev.",
      },
    });
    const count = await testDb.pool.query<{ count: string }>(
      `select count(*)::text from finance_journal_transactions`,
    );
    expect(count.rows[0]?.count).toBe("1");
  });

  it("serializes concurrent identical requests into one journal transaction", async () => {
    const body = {
      operation: "income",
      accountId: fixtures.cashId,
      categoryId: fixtures.incomeCategoryId,
      amount: "250.00",
    };

    const [first, second] = await Promise.all([
      handler(request(body, { idempotencyKey: "concurrent-key" })),
      handler(request(body, { idempotencyKey: "concurrent-key" })),
    ]);
    const [firstBody, secondBody] = await Promise.all([json(first), json(second)]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(secondBody).toEqual(firstBody);

    const counts = await testDb.pool.query<{ idempotency: string; journals: string }>(
      `select
         (select count(*)::text from finance_idempotency_records) as idempotency,
         (select count(*)::text from finance_journal_transactions) as journals`,
    );
    expect(counts.rows[0]).toEqual({ idempotency: "1", journals: "1" });
  });
});

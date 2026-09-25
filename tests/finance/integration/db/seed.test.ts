import { count } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedDatabase } from "@/modules/finance/db/seed";
import {
  accounts,
  currencies,
  instruments,
  taxLots,
} from "@/modules/finance/db/schema";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

describe("database seed", () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("seeds twice without inventing positions", async () => {
    await seedDatabase(testDb.db);
    await seedDatabase(testDb.db);

    const [instrumentCount] = await testDb.db
      .select({ value: count() })
      .from(instruments);
    const [lotCount] = await testDb.db.select({ value: count() }).from(taxLots);

    expect(instrumentCount?.value).toBe(5);
    expect(lotCount?.value).toBe(0);
  });

  it("seeds the ISO catalog with exactly the required active currencies", async () => {
    await seedDatabase(testDb.db);

    await testDb.pool.query(
      `update finance_accounts
          set name = 'Moja dugovanja EUR'
        where id = 'receivable-eur'`,
    );

    await seedDatabase(testDb.db);

    const catalogCurrencies = await testDb.db
      .select({
        code: currencies.code,
        isActive: currencies.isActive,
        name: currencies.name,
      })
      .from(currencies)
      .orderBy(currencies.code);

    expect(
      catalogCurrencies
        .filter((currency) => currency.isActive)
        .map((currency) => currency.code),
    ).toEqual(["EUR", "HUF", "RSD", "USD"]);
    expect(catalogCurrencies).toEqual(
      expect.arrayContaining([
        { code: "EUR", isActive: true, name: "Euro" },
        { code: "HUF", isActive: true, name: "Hungarian forint" },
        { code: "RSD", isActive: true, name: "Serbian dinar" },
        { code: "USD", isActive: true, name: "United States dollar" },
        { code: "CHF", isActive: false, name: "Swiss franc" },
      ]),
    );

    await testDb.pool.query(
      `update finance_currencies
          set is_active = true,
              activated_at = now()
        where code = 'CHF'`,
    );

    const { rows: activatedCurrencies } = await testDb.pool.query<{
      code: string;
      is_active: boolean;
    }>(
      `select code, is_active
         from finance_currencies
        where code = 'CHF'`,
    );

    expect(activatedCurrencies[0]).toMatchObject({
      code: "CHF",
      is_active: true,
    });

    const seededAccounts = await testDb.db
      .select({
        id: accounts.id,
        name: accounts.name,
        classification: accounts.classification,
        currencyCode: accounts.currencyCode,
        isSystem: accounts.isSystem,
      })
      .from(accounts)
      .orderBy(accounts.id);

    expect(seededAccounts).toEqual(
      expect.arrayContaining([
        {
          id: "system-equity",
          name: "System equity",
          classification: "equity",
          currencyCode: "EUR",
          isSystem: true,
        },
        {
          id: "system-income",
          name: "System income",
          classification: "income",
          currencyCode: "EUR",
          isSystem: true,
        },
        {
          id: "system-expense",
          name: "System expense",
          classification: "expense",
          currencyCode: "EUR",
          isSystem: true,
        },
        {
          id: "system-fx",
          name: "System foreign exchange",
          classification: "equity",
          currencyCode: "EUR",
          isSystem: true,
        },
        {
          id: "system-fees",
          name: "System fees",
          classification: "expense",
          currencyCode: "EUR",
          isSystem: true,
        },
        {
          id: "receivable-rsd",
          name: "Dugovanja prema meni — RSD",
          classification: "receivable",
          currencyCode: "RSD",
          isSystem: false,
        },
        {
          id: "receivable-eur",
          name: "Moja dugovanja EUR",
          classification: "receivable",
          currencyCode: "EUR",
          isSystem: false,
        },
      ]),
    );
  });
});

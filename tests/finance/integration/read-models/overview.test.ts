import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { setBudgetLimit } from "@/modules/finance/application/budgets";
import { createCategory } from "@/modules/finance/application/categories";
import { createGoal } from "@/modules/finance/application/goals";
import {
  buyInvestment,
  sellInvestment,
} from "@/modules/finance/application/investments";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import { recordTransaction } from "@/modules/finance/application/transactions";
import { setManualOverride } from "@/modules/finance/application/valuation";
import { seedDatabase } from "@/modules/finance/db/seed";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { listAccounts } from "@/modules/finance/read-models/accounts";
import { listBudgets } from "@/modules/finance/read-models/budgets";
import { getDashboard } from "@/modules/finance/read-models/dashboard";
import { listGoals } from "@/modules/finance/read-models/goals";
import { listInvestments } from "@/modules/finance/read-models/investments";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

const NOW = new Date("2026-08-30T12:00:00.000Z");
const VALUATION_OPTIONS = {
  exchangeRateStaleAfterMs: 36 * 60 * 60 * 1_000,
  marketDataStaleAfterMs: 36 * 60 * 60 * 1_000,
};

function makeDependencies(testDb: TestDatabase): ApplicationDependencies {
  let sequence = 0;

  return {
    unitOfWork: {
      run: (work, config) => testDb.db.transaction((tx) => work(tx), config),
    } satisfies UnitOfWork,
    ids: { nextId: (kind: IdKind) => `${kind}-${++sequence}` },
    clock: { now: () => NOW },
  };
}

describe("finance overview read models", () => {
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

  it("builds traceable dashboard, account, budget, goal, and investment views", async () => {
    const cash = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Tekući račun",
      subtype: "bank",
    });
    const dinars = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "RSD",
      name: "Dinari",
      subtype: "cash",
    });
    const brokerCash = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Broker cash",
      subtype: "broker_cash",
    });
    const card = await createAccount(dependencies, {
      classification: "liability",
      currencyCode: "EUR",
      name: "Kartica",
      subtype: "credit_card",
    });
    const groceries = await createCategory(dependencies, {
      classification: "expense",
      name: "Namirnice",
    });
    const salary = await createCategory(dependencies, {
      classification: "income",
      name: "Plata",
    });

    await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "1000",
      occurredAt: new Date("2026-07-01T08:00:00.000Z"),
      type: "opening_balance",
    });
    await recordTransaction(dependencies, {
      accountId: dinars.id,
      amount: "10000",
      occurredAt: new Date("2026-07-01T08:00:00.000Z"),
      type: "opening_balance",
    });
    await recordTransaction(dependencies, {
      accountId: brokerCash.id,
      amount: "1000",
      occurredAt: new Date("2026-07-01T08:00:00.000Z"),
      type: "opening_balance",
    });
    await recordTransaction(dependencies, {
      accountId: card.id,
      amount: "100",
      occurredAt: new Date("2026-07-01T08:00:00.000Z"),
      type: "opening_balance",
    });
    await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "500",
      categoryId: salary.id,
      occurredAt: new Date("2026-08-05T08:00:00.000Z"),
      source: "shortcut",
      type: "income",
    });
    await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "20",
      categoryId: groceries.id,
      occurredAt: new Date("2026-07-15T08:00:00.000Z"),
      type: "expense",
    });
    await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "100",
      categoryId: groceries.id,
      occurredAt: new Date("2026-08-15T08:00:00.000Z"),
      type: "expense",
    });

    await setBudgetLimit(dependencies, {
      amount: "150",
      categoryId: groceries.id,
      currencyCode: "EUR",
      month: "2026-07",
    });
    await setBudgetLimit(dependencies, {
      amount: "200",
      categoryId: groceries.id,
      currencyCode: "EUR",
      month: "2026-08",
    });
    await createGoal(dependencies, {
      accountId: cash.id,
      name: "Fond za hitne slučajeve",
      targetAmount: "2000",
      targetCurrencyCode: "EUR",
    });
    await testDb.pool.query(
      "insert into finance_investment_accounts (id, name, cash_account_id) values ('broker', 'Broker', $1)",
      [brokerCash.id],
    );
    await buyInvestment(dependencies, {
      grossAmount: "100",
      instrumentId: "instrument-vwce",
      investmentAccountId: "broker",
      quantity: "10",
      tradeCurrencyCode: "EUR",
      tradeFxRateToEur: "1",
    });
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('quote-vwce', 'instrument-vwce', 'EUR', 15, 'alpha_vantage', $1, $1, 'valid')`,
      [new Date("2026-08-30T10:00:00.000Z")],
    );
    await setManualOverride(dependencies, {
      baseCurrencyCode: "RSD",
      kind: "exchange_rate",
      quoteCurrencyCode: "EUR",
      value: "0.01",
    });

    const [dashboard, accountView, budgetView, goalView, investmentView] =
      await Promise.all([
        getDashboard(dependencies, VALUATION_OPTIONS),
        listAccounts(dependencies, VALUATION_OPTIONS),
        listBudgets(dependencies, { month: "2026-08" }),
        listGoals(dependencies),
        listInvestments(dependencies, VALUATION_OPTIONS),
      ]);

    expect(dashboard.netWorth).toEqual({
      amount: "2430",
      complete: true,
      currencyCode: "EUR",
    });
    expect(dashboard.totals).toEqual({ assetsEur: "2530", liabilitiesEur: "100" });
    expect(dashboard.cashFlow).toEqual({
      complete: true,
      expenseEur: "100",
      incomeEur: "500",
      netEur: "400",
    });
    expect(dashboard.valuationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ manual: true, source: "manual", stale: false }),
        expect.objectContaining({ manual: false, source: "alpha_vantage", stale: false }),
      ]),
    );

    expect(accountView.groups.asset).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: dinars.id,
          nativeBalance: "10000",
          eurEstimate: "100",
          valuation: expect.objectContaining({ manual: true }),
        }),
      ]),
    );
    expect(accountView.groups.liability).toEqual([
      expect.objectContaining({
        id: card.id,
        nativeBalance: "100",
        eurEstimate: "100",
        recentActivity: [expect.objectContaining({ amount: "100" })],
      }),
    ]);
    expect(budgetView.items).toEqual([
      expect.objectContaining({
        availableAmount: "330",
        carryInAmount: "130",
        categoryName: "Namirnice",
        remainingAmount: "230",
        spendingAmount: "100",
      }),
    ]);
    expect(goalView.items).toEqual([
      expect.objectContaining({
        balance: "1380",
        name: "Fond za hitne slučajeve",
        percentage: "69",
      }),
    ]);
    expect(investmentView.positions).toEqual([
      expect.objectContaining({
        costBasisEur: "100",
        marketValueEur: "150",
        quantity: "10",
        symbol: "VWCE",
        unrealizedReturnEur: "50",
      }),
    ]);
  });

  it("retains realized performance after the last unit is sold", async () => {
    const cash = await createAccount(dependencies, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Zatvoreni broker",
      subtype: "broker_cash",
    });
    await testDb.pool.query(
      "insert into finance_investment_accounts (id, name, cash_account_id) values ('closed-broker', 'Closed broker', $1)",
      [cash.id],
    );
    await recordTransaction(dependencies, {
      accountId: cash.id,
      amount: "1000",
      type: "opening_balance",
    });
    await buyInvestment(dependencies, {
      grossAmount: "100",
      instrumentId: "instrument-vwce",
      investmentAccountId: "closed-broker",
      quantity: "10",
      tradeCurrencyCode: "EUR",
      tradeFxRateToEur: "1",
    });
    await sellInvestment(dependencies, {
      grossAmount: "150",
      instrumentId: "instrument-vwce",
      investmentAccountId: "closed-broker",
      quantity: "10",
      tradeCurrencyCode: "EUR",
      tradeFxRateToEur: "1",
    });

    const investments = await listInvestments(
      dependencies,
      VALUATION_OPTIONS,
    );

    expect(investments.positions).toEqual([]);
    expect(investments.totals.realizedReturnEur).toBe("50");
  });
});

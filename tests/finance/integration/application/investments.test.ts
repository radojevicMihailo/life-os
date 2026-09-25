import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { setBudgetLimit } from "@/modules/finance/application/budgets";
import {
  archiveCategory,
  createCategory,
} from "@/modules/finance/application/categories";
import {
  buyInvestment,
  createInvestmentAccount,
  getPositionPerformance,
  recordOpeningLot,
  recordDividend,
  recordInvestmentFee,
  resolveInstrument,
  sellInvestment,
} from "@/modules/finance/application/investments";
import { correctTransaction } from "@/modules/finance/application/transactions";
import type {
  ApplicationDependencies,
  IdKind,
} from "@/modules/finance/application/ports";
import { seedDatabase } from "@/modules/finance/db/seed";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

function makeDeps(testDb: TestDatabase, ids?: string[]): ApplicationDependencies {
  let sequence = 0;
  const explicit = ids ? [...ids] : undefined;

  return {
    unitOfWork: {
      run: (work) => testDb.db.transaction((tx) => work(tx)),
    } satisfies UnitOfWork,
    ids: {
      nextId(kind: IdKind) {
        sequence += 1;
        return explicit?.shift() ?? `${kind}-${sequence}`;
      },
    },
    clock: { now: () => new Date("2026-08-22T12:00:00.000Z") },
  };
}

async function setupInvestmentAccount(
  testDb: TestDatabase,
  deps: ApplicationDependencies,
  options?: { currencyCode?: string; id?: string },
) {
  const currencyCode = options?.currencyCode ?? "EUR";
  const investmentAccountId = options?.id ?? "broker";
  const cash = await createAccount(deps, {
    classification: "asset",
    currencyCode,
    name: `Broker cash ${currencyCode}`,
    subtype: "broker_cash",
  });
  await testDb.pool.query(
    `insert into finance_investment_accounts (id, name, cash_account_id)
     values ($1, $2, $3)`,
    [investmentAccountId, `Primary broker ${currencyCode}`, cash.id],
  );
  return cash;
}

async function tableCounts(testDb: TestDatabase) {
  const result = await testDb.pool.query<{
    investment_transactions: string;
    journal_transactions: string;
    lot_disposals: string;
    tax_lots: string;
  }>(`select
    (select count(*)::text from finance_journal_transactions) journal_transactions,
    (select count(*)::text from finance_investment_transactions) investment_transactions,
    (select count(*)::text from finance_tax_lots) tax_lots,
    (select count(*)::text from finance_lot_disposals) lot_disposals`);
  return result.rows[0];
}

describe("investment application service", () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    await testDb.pool.query(
      "truncate table finance_journal_transactions, finance_investment_accounts, finance_categories, finance_currencies cascade",
    );
    await seedDatabase(testDb.db);
  });

  afterAll(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it.each([
    ["instrument-googl", "stock", "1.12345678"],
    ["instrument-vwce", "etf", "2.12345678"],
    ["instrument-btc", "crypto", "0.123456789012345678"],
  ] as const)(
    "atomically buys %s using %s quantity precision and preserves trade metadata",
    async (instrumentId, _assetClass, quantity) => {
      const deps = makeDeps(testDb);
      const cash = await setupInvestmentAccount(testDb, deps);

      const result = await buyInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId,
        quantity,
        tradeCurrencyCode: "EUR",
        grossAmount: "1000.00",
        feeAmount: "7.25",
        tradeFxRateToEur: "1",
        occurredAt: new Date("2026-03-01T09:30:00.000Z"),
      });

      expect(result).toMatchObject({
        quantity,
        tradeCurrencyCode: "EUR",
        grossAmount: "1000.00",
        feeAmount: "7.25",
        tradeFxRateToEur: "1.000000000000000000",
        type: "buy",
      });
      const stored = await testDb.pool.query<{
        cost_amount: string;
        fee_amount: string;
        gross_amount: string;
        quantity: string;
        trade_currency_code: string;
        trade_fx_rate_to_eur: string;
      }>(
        `select it.quantity::text, it.trade_currency_code,
                it.gross_amount::text, it.fee_amount::text,
                it.trade_fx_rate_to_eur::text, tl.cost_amount::text
           from finance_investment_transactions it
           join finance_tax_lots tl on tl.investment_transaction_id = it.id
          where it.id = $1`,
        [result.id],
      );
      expect(stored.rows[0]).toMatchObject({
        cost_amount: "1000.000000000000000000",
        fee_amount: "7.250000000000000000",
        gross_amount: "1000.000000000000000000",
        quantity: `${quantity}${"0".repeat(24 - (quantity.split(".")[1]?.length ?? 0))}`,
        trade_currency_code: "EUR",
        trade_fx_rate_to_eur: "1.000000000000000000",
      });
      await expect(
        testDb.pool.query(
          `select coalesce(sum(amount), 0)::text balance
             from finance_journal_postings where account_id = $1`,
          [cash.id],
        ),
      ).resolves.toMatchObject({ rows: [{ balance: "-1007.250000000000000000" }] });
    },
  );

  it("creates a truthful opening lot without inventing a cash-side journal", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Broker cash",
      subtype: "broker_cash",
    });
    const investmentAccount = await createInvestmentAccount(deps, {
      cashAccountId: cash.id,
      name: "Primary broker",
    });

    const opening = await recordOpeningLot(deps, {
      acquiredAt: new Date("2024-01-10T00:00:00.000Z"),
      currencyCode: "EUR",
      fees: "5",
      instrumentId: "instrument-btc",
      investmentAccountId: investmentAccount.id,
      price: "40000",
      quantity: "0.125",
      tradeFxRateToEur: "1",
    });

    expect(opening).toMatchObject({
      costAmount: "5000.00",
      feeAmount: "5.00",
      quantity: "0.125",
    });
    expect(await tableCounts(testDb)).toMatchObject({
      investment_transactions: "1",
      journal_transactions: "0",
      tax_lots: "1",
      lot_disposals: "0",
    });
    await expect(testDb.pool.query(
      "select journal_transaction_id from finance_investment_transactions where id = $1",
      [opening.id],
    )).resolves.toMatchObject({ rows: [{ journal_transaction_id: null }] });
  });

  it("rejects a negative opening-lot fee without persisting investment history", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset",
      currencyCode: "EUR",
      name: "Opening fee cash",
      subtype: "broker_cash",
    });
    const investmentAccount = await createInvestmentAccount(deps, {
      cashAccountId: cash.id,
      name: "Opening fee broker",
    });

    await expect(recordOpeningLot(deps, {
      acquiredAt: new Date("2024-01-10T00:00:00.000Z"),
      currencyCode: "EUR",
      fees: "-1",
      instrumentId: "instrument-btc",
      investmentAccountId: investmentAccount.id,
      price: "40000",
      quantity: "0.125",
      tradeFxRateToEur: "1",
    })).rejects.toMatchObject({ code: "money_non_positive" });
    expect(await tableCounts(testDb)).toMatchObject({
      investment_transactions: "0",
      journal_transactions: "0",
      tax_lots: "0",
      lot_disposals: "0",
    });
  });

  it("persists an additional instrument only after provider resolution and quote validation", async () => {
    const deps = makeDeps(testDb);
    const requested: string[] = [];
    const provider = {
      provider: "alpha_vantage",
      async resolveSymbol() {
        requested.push("resolve");
        return { providerId: "MSFT", currencyCode: "USD" };
      },
      async fetchQuotes(requests: Array<{ instrumentId: string; providerId: string; quoteCurrencyCode: string }>) {
        requested.push("quote");
        return {
          quotes: requests.map((request) => ({
            ...request,
            price: "500",
            provider: "alpha_vantage",
            providerTimestamp: new Date("2026-08-22T00:00:00.000Z"),
            retrievedAt: new Date("2026-08-22T12:00:00.000Z"),
          })),
          skippedProviderIds: [],
        };
      },
    };

    await expect(resolveInstrument(deps, {
      class: "stock",
      exchange: "Nasdaq",
      name: "Microsoft Corporation",
      provider: "alpha_vantage",
      quoteCurrencyCode: "USD",
      symbol: "MSFT",
    }, provider)).resolves.toMatchObject({ providerId: "MSFT", symbol: "MSFT" });
    expect(requested).toEqual(["resolve", "quote"]);
    await expect(testDb.pool.query(
      "select provider_id from finance_instruments where symbol = 'MSFT'",
    )).resolves.toMatchObject({ rows: [{ provider_id: "MSFT" }] });
  });

  it.each([
    ["instrument id", { instrumentId: "wrong-instrument" }],
    ["provider id", { providerId: "wrong-provider-id" }],
    ["quote currency", { quoteCurrencyCode: "EUR" }],
    ["provider", { provider: "coingecko" }],
    ["malformed price", { price: "not-a-price" }],
    ["zero price", { price: "0" }],
    ["negative price", { price: "-1" }],
  ])("rejects a provider quote with mismatched or invalid %s before persistence", async (_case, quoteOverride) => {
    const deps = makeDeps(testDb);
    const provider = {
      provider: "alpha_vantage",
      async resolveSymbol() {
        return { providerId: "MSFT", currencyCode: "USD" };
      },
      async fetchQuotes(requests: Array<{ instrumentId: string; providerId: string; quoteCurrencyCode: string }>) {
        return {
          quotes: [{
            ...requests[0]!,
            price: "500",
            provider: "alpha_vantage",
            providerTimestamp: new Date("2026-08-22T00:00:00.000Z"),
            retrievedAt: new Date("2026-08-22T12:00:00.000Z"),
            ...quoteOverride,
          }],
          skippedProviderIds: [],
        };
      },
    };

    await expect(resolveInstrument(deps, {
      class: "stock",
      name: "Microsoft Corporation",
      provider: "alpha_vantage",
      quoteCurrencyCode: "USD",
      symbol: "MSFT",
    }, provider)).rejects.toMatchObject({ code: "investment_provider_resolution_failed" });
    await expect(testDb.pool.query(
      "select count(*)::text as count from finance_instruments where symbol = 'MSFT'",
    )).resolves.toMatchObject({ rows: [{ count: "0" }] });
  });

  it("sells FIFO with acquisition and sale fees and stable equal-time lot order", async () => {
    const setupDeps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, setupDeps);
    const acquiredAt = new Date("2026-01-01T00:00:00.000Z");
    const first = await buyInvestment(makeDeps(testDb, [
      "journal-buy-a", "posting-buy-a-1", "posting-buy-a-2", "investment-buy-a", "lot-a",
    ]), {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "4",
      tradeFxRateToEur: "1",
      occurredAt: acquiredAt,
    });
    const second = await buyInvestment(makeDeps(testDb, [
      "journal-buy-b", "posting-buy-b-1", "posting-buy-b-2", "investment-buy-b", "lot-b",
    ]), {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "3",
      tradeCurrencyCode: "EUR",
      grossAmount: "360",
      feeAmount: "6",
      tradeFxRateToEur: "1",
      occurredAt: acquiredAt,
    });

    const result = await sellInvestment(makeDeps(testDb), {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2.5",
      tradeCurrencyCode: "EUR",
      grossAmount: "400",
      feeAmount: "10",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const orderedLotIds = [first.lotId, second.lotId].sort();
    expect(result.disposals).toMatchObject([
      { lotId: orderedLotIds[0], quantity: "2", costBasisAmount: "204" },
      { lotId: orderedLotIds[1], quantity: "0.5", costBasisAmount: "61" },
    ]);
    expect(result).toMatchObject({
      costBasis: "265",
      netProceeds: "390",
      realizedReturn: "125",
    });
  });

  it("rejects insufficient quantity without leaving a journal or trade", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);

    await expect(
      sellInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        quantity: "0.1",
        tradeCurrencyCode: "EUR",
        grossAmount: "10",
        feeAmount: "0",
        tradeFxRateToEur: "1",
      }),
    ).rejects.toMatchObject({ code: "investment_quantity_insufficient" });
    expect(await tableCounts(testDb)).toMatchObject({
      investment_transactions: "0",
      journal_transactions: "0",
      lot_disposals: "0",
      tax_lots: "0",
    });
  });

  it("rejects negative buy and sell fees before writing and accepts explicit zero fees", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);

    await expect(
      buyInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        quantity: "1",
        tradeCurrencyCode: "EUR",
        grossAmount: "100",
        feeAmount: "-1.00",
        tradeFxRateToEur: "1",
      }),
    ).rejects.toMatchObject({ code: "money_non_positive" });
    expect(await tableCounts(testDb)).toMatchObject({
      investment_transactions: "0",
      journal_transactions: "0",
      lot_disposals: "0",
      tax_lots: "0",
    });

    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "1",
      tradeCurrencyCode: "EUR",
      grossAmount: "100",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const beforeNegativeSell = await tableCounts(testDb);

    await expect(
      sellInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        quantity: "0.25",
        tradeCurrencyCode: "EUR",
        grossAmount: "40",
        feeAmount: "-1.00",
        tradeFxRateToEur: "1",
        occurredAt: new Date("2026-02-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "money_non_positive" });
    expect(await tableCounts(testDb)).toEqual(beforeNegativeSell);

    const zeroFeeSale = await sellInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "0.25",
      tradeCurrencyCode: "EUR",
      grossAmount: "40",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(zeroFeeSale.feeAmount).toBe("0.00");
  });

  it("excludes future-acquired lots from a backdated sale and writes nothing", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const before = await tableCounts(testDb);

    await expect(
      sellInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-vwce",
        quantity: "1",
        tradeCurrencyCode: "EUR",
        grossAmount: "120",
        feeAmount: "0",
        tradeFxRateToEur: "1",
        occurredAt: new Date("2026-05-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "investment_quantity_insufficient" });
    expect(await tableCounts(testDb)).toEqual(before);
  });

  it("rejects a backfilled buy after a later disposal without changing persisted history", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await sellInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "1",
      tradeCurrencyCode: "EUR",
      grossAmount: "120",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const before = await tableCounts(testDb);
    const lotsBefore = await testDb.pool.query(
      `select id, remaining_quantity::text
         from finance_tax_lots order by id`,
    );

    await expect(
      buyInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-vwce",
        quantity: "1",
        tradeCurrencyCode: "EUR",
        grossAmount: "90",
        feeAmount: "0",
        tradeFxRateToEur: "1",
        occurredAt: new Date("2026-03-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "investment_backfill_after_disposal" });
    expect(await tableCounts(testDb)).toEqual(before);
    await expect(testDb.pool.query(
      `select id, remaining_quantity::text
         from finance_tax_lots order by id`,
    )).resolves.toMatchObject({ rows: lotsBefore.rows });
  });

  it("rejects a sale earlier than an existing posted disposal without changing history", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "3",
      tradeCurrencyCode: "EUR",
      grossAmount: "300",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await sellInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "1",
      tradeCurrencyCode: "EUR",
      grossAmount: "120",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const before = await tableCounts(testDb);
    const lotsBefore = await testDb.pool.query(
      "select id, remaining_quantity::text from finance_tax_lots order by id",
    );

    await expect(
      sellInvestment(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-vwce",
        quantity: "1",
        tradeCurrencyCode: "EUR",
        grossAmount: "110",
        feeAmount: "0",
        tradeFxRateToEur: "1",
        occurredAt: new Date("2026-05-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      code: "investment_backdated_sale_after_disposal",
    });
    expect(await tableCounts(testDb)).toEqual(before);
    await expect(testDb.pool.query(
      "select id, remaining_quantity::text from finance_tax_lots order by id",
    )).resolves.toMatchObject({ rows: lotsBefore.rows });
  });

  it.each(["buy", "sell", "dividend", "fee"] as const)(
    "rejects generic correction of an investment-linked %s journal without writes",
    async (type) => {
      const deps = makeDeps(testDb);
      const cash = await setupInvestmentAccount(testDb, deps);
      const base = {
        investmentAccountId: "broker",
        instrumentId: "instrument-vwce",
        tradeCurrencyCode: "EUR",
        tradeFxRateToEur: "1",
      };
      let journalId: string;

      if (type === "buy" || type === "sell") {
        const buy = await buyInvestment(deps, {
          ...base,
          quantity: "2",
          grossAmount: "200",
          feeAmount: "0",
          occurredAt: new Date("2026-01-01T00:00:00.000Z"),
        });
        journalId = buy.journalTransaction.id;

        if (type === "sell") {
          const sell = await sellInvestment(deps, {
            ...base,
            quantity: "1",
            grossAmount: "120",
            feeAmount: "0",
            occurredAt: new Date("2026-02-01T00:00:00.000Z"),
          });
          journalId = sell.journalTransaction.id;
        }
      } else if (type === "dividend") {
        journalId = (await recordDividend(deps, {
          ...base,
          grossAmount: "10",
        })).journalTransaction.id;
      } else {
        journalId = (await recordInvestmentFee(deps, {
          ...base,
          feeAmount: "10",
        })).journalTransaction.id;
      }

      const before = await tableCounts(testDb);
      await expect(correctTransaction(deps, {
        originalId: journalId,
        replacement: {
          type: "opening_balance",
          accountId: cash.id,
          amount: "1",
        },
      })).rejects.toMatchObject({
        code: "investment_journal_correction_unsupported",
      });
      expect(await tableCounts(testDb)).toEqual(before);
      await expect(testDb.pool.query(
        "select corrected_by_id from finance_journal_transactions where id = $1",
        [journalId],
      )).resolves.toMatchObject({ rows: [{ corrected_by_id: null }] });
    },
  );

  it("reuses a compatible named fee category and recomputes its budget cache", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    const category = await createCategory(deps, {
      classification: "expense",
      name: "Investment fees",
    });
    await setBudgetLimit(deps, {
      amount: "100",
      categoryId: category.id,
      currencyCode: "EUR",
      month: "2026-03",
    });

    const fee = await recordInvestmentFee(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      tradeCurrencyCode: "EUR",
      feeAmount: "10",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-03-10T00:00:00.000Z"),
    });

    await expect(testDb.pool.query(
      `select category_id
         from finance_journal_postings
        where transaction_id = $1 and category_id is not null`,
      [fee.journalTransaction.id],
    )).resolves.toMatchObject({ rows: [{ category_id: category.id }] });
    await expect(testDb.pool.query(
      `select spending_amount::text, remaining_amount::text
         from finance_budget_periods
        where category_id = $1 and month = '2026-03-01'`,
      [category.id],
    )).resolves.toMatchObject({
      rows: [{
        spending_amount: "10.000000000000000000",
        remaining_amount: "90.000000000000000000",
      }],
    });
  });

  it.each([
    ["incompatible", "income", false, "category_classification_mismatch"],
    ["inactive", "expense", true, "category_inactive"],
  ] as const)(
    "rejects an %s same-name fee category without investment writes",
    async (_case, classification, archive, code) => {
      const deps = makeDeps(testDb);
      await setupInvestmentAccount(testDb, deps);
      const category = await createCategory(deps, {
        classification,
        name: "Investment fees",
      });
      if (archive) {
        await archiveCategory(deps, { id: category.id });
      }
      const before = await tableCounts(testDb);

      await expect(recordInvestmentFee(deps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-vwce",
        tradeCurrencyCode: "EUR",
        feeAmount: "10",
        tradeFxRateToEur: "1",
      })).rejects.toMatchObject({ code });
      expect(await tableCounts(testDb)).toEqual(before);
    },
  );

  it("requires identity EUR-to-EUR trade and reporting rates while accepting canonical one", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);

    await expect(buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "0",
      tradeFxRateToEur: "1.1",
    })).rejects.toMatchObject({ code: "investment_eur_fx_rate_not_identity" });
    expect(await tableCounts(testDb)).toMatchObject({
      investment_transactions: "0",
      journal_transactions: "0",
      lot_disposals: "0",
      tax_lots: "0",
    });

    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "0",
      tradeFxRateToEur: "1",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const beforeSell = await tableCounts(testDb);
    await expect(sellInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "1",
      tradeCurrencyCode: "EUR",
      grossAmount: "120",
      feeAmount: "0",
      tradeFxRateToEur: "0.9",
      occurredAt: new Date("2026-02-01T00:00:00.000Z"),
    })).rejects.toMatchObject({ code: "investment_eur_fx_rate_not_identity" });
    expect(await tableCounts(testDb)).toEqual(beforeSell);

    const valuation = {
      quote: {
        price: "120",
        currencyCode: "EUR",
        source: {
          kind: "manual" as const,
          provider: "user",
          effectiveAt: new Date("2026-02-01T00:00:00.000Z"),
        },
      },
      reportingFx: {
        rate: "1.1",
        baseCurrencyCode: "EUR",
        quoteCurrencyCode: "EUR" as const,
        source: {
          kind: "manual" as const,
          provider: "user",
          effectiveAt: new Date("2026-02-01T00:00:00.000Z"),
        },
      },
    };
    await expect(getPositionPerformance(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      valuation,
    })).rejects.toMatchObject({ code: "investment_eur_fx_rate_not_identity" });

    await expect(getPositionPerformance(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      valuation: {
        ...valuation,
        reportingFx: { ...valuation.reportingFx, rate: "1" },
      },
    })).resolves.toMatchObject({ marketValue: { reportingAmount: "240" } });
  });

  it("rolls back the lot, trade, and cash journal when the lot-side insert fails", async () => {
    const initialDeps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, initialDeps);
    const first = await buyInvestment(initialDeps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "1",
      tradeCurrencyCode: "EUR",
      grossAmount: "100",
      feeAmount: "0",
      tradeFxRateToEur: "1",
    });
    const before = await tableCounts(testDb);
    const failingDeps = makeDeps(testDb, [
      "journal-second",
      "posting-second-1",
      "posting-second-2",
      "investment-second",
      first.lotId,
    ]);

    await expect(
      buyInvestment(failingDeps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        quantity: "1",
        tradeCurrencyCode: "EUR",
        grossAmount: "200",
        feeAmount: "0",
        tradeFxRateToEur: "1",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    expect(await tableCounts(testDb)).toEqual(before);
  });

  it("rolls back without a partial trade or lot when the cash-side journal fails", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    const first = await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "1",
      tradeCurrencyCode: "EUR",
      grossAmount: "100",
      feeAmount: "0",
      tradeFxRateToEur: "1",
    });
    const before = await tableCounts(testDb);
    const failingDeps = makeDeps(testDb, [first.journalTransaction.id]);

    await expect(
      buyInvestment(failingDeps, {
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        quantity: "1",
        tradeCurrencyCode: "EUR",
        grossAmount: "200",
        feeAmount: "0",
        tradeFxRateToEur: "1",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    expect(await tableCounts(testDb)).toEqual(before);
  });

  it("records dividends and standalone fees without changing lot quantities or basis", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "4",
      tradeFxRateToEur: "1",
    });
    const before = await testDb.pool.query(
      "select quantity::text, remaining_quantity::text, cost_amount::text, fee_amount::text from finance_tax_lots",
    );

    const dividend = await recordDividend(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      tradeCurrencyCode: "EUR",
      grossAmount: "12.50",
      tradeFxRateToEur: "1",
    });
    const fee = await recordInvestmentFee(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-vwce",
      tradeCurrencyCode: "EUR",
      feeAmount: "2.50",
      tradeFxRateToEur: "1",
    });

    expect(dividend.type).toBe("dividend");
    expect(dividend.journalTransaction.type).toBe("income");
    expect(fee.type).toBe("fee");
    expect(fee.journalTransaction.type).toBe("fee");
    expect(await testDb.pool.query(
      "select quantity::text, remaining_quantity::text, cost_amount::text, fee_amount::text from finance_tax_lots",
    )).toMatchObject({ rows: before.rows });
  });

  it("reports realized and unrealized returns in quote and EUR with explicit source metadata", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps);
    await buyInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-googl",
      quantity: "2",
      tradeCurrencyCode: "EUR",
      grossAmount: "200",
      feeAmount: "4",
      tradeFxRateToEur: "1",
    });
    await sellInvestment(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-googl",
      quantity: "0.5",
      tradeCurrencyCode: "EUR",
      grossAmount: "80",
      feeAmount: "2",
      tradeFxRateToEur: "1",
    });
    const quoteSource = {
      kind: "automatic" as const,
      provider: "alpha_vantage",
      effectiveAt: new Date("2026-08-22T11:55:00.000Z"),
      retrievedAt: new Date("2026-08-22T11:56:00.000Z"),
    };
    const fxSource = {
      kind: "manual" as const,
      provider: "user",
      effectiveAt: new Date("2026-08-22T11:57:00.000Z"),
    };

    const result = await getPositionPerformance(deps, {
      investmentAccountId: "broker",
      instrumentId: "instrument-googl",
      valuation: {
        quote: {
          price: "150",
          currencyCode: "USD",
          source: quoteSource,
        },
        reportingFx: {
          rate: "0.8",
          baseCurrencyCode: "USD",
          quoteCurrencyCode: "EUR",
          source: fxSource,
        },
      },
    });

    expect(result).toMatchObject({
      quantity: "1.5",
      realizedReturn: {
        amount: "27",
        currencyCode: "EUR",
        reportingAmount: "27",
        reportingCurrencyCode: "EUR",
      },
      openCostBasis: {
        amount: "153",
        currencyCode: "EUR",
        reportingAmount: "153",
        reportingCurrencyCode: "EUR",
      },
      marketValue: {
        amount: "225",
        currencyCode: "USD",
        reportingAmount: "180",
        reportingCurrencyCode: "EUR",
      },
      unrealizedReturn: {
        amount: "33.75",
        currencyCode: "USD",
        reportingAmount: "27",
        reportingCurrencyCode: "EUR",
      },
      valuation: {
        quote: { source: quoteSource },
        reportingFx: { source: fxSource },
      },
    });
  });

  it("reports non-EUR realized return directly in trade currency and separately in historical-FX EUR", async () => {
    const deps = makeDeps(testDb);
    await setupInvestmentAccount(testDb, deps, {
      currencyCode: "HUF",
      id: "broker-huf",
    });
    await buyInvestment(deps, {
      investmentAccountId: "broker-huf",
      instrumentId: "instrument-googl",
      quantity: "2",
      tradeCurrencyCode: "HUF",
      grossAmount: "40000",
      feeAmount: "400",
      tradeFxRateToEur: "0.0025",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await sellInvestment(deps, {
      investmentAccountId: "broker-huf",
      instrumentId: "instrument-googl",
      quantity: "0.5",
      tradeCurrencyCode: "HUF",
      grossAmount: "15000",
      feeAmount: "300",
      tradeFxRateToEur: "0.0027",
      occurredAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const result = await getPositionPerformance(deps, {
      investmentAccountId: "broker-huf",
      instrumentId: "instrument-googl",
      valuation: {
        quote: {
          price: "150",
          currencyCode: "USD",
          source: {
            kind: "automatic",
            provider: "alpha_vantage",
            effectiveAt: new Date("2026-08-22T11:55:00.000Z"),
          },
        },
        reportingFx: {
          rate: "0.8",
          baseCurrencyCode: "USD",
          quoteCurrencyCode: "EUR",
          source: {
            kind: "manual",
            provider: "user",
            effectiveAt: new Date("2026-08-22T11:57:00.000Z"),
          },
        },
      },
    });

    expect(result.realizedReturn).toEqual({
      amount: "4600",
      currencyCode: "HUF",
      reportingAmount: "14.44",
      reportingCurrencyCode: "EUR",
    });
  });
});

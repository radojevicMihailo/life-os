import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAccount } from "@/modules/finance/application/accounts";
import { AlphaVantageClient } from "@/modules/finance/adapters/alpha-vantage/client";
import { CoinGeckoClient } from "@/modules/finance/adapters/coingecko/client";
import { buyInvestment, sellInvestment } from "@/modules/finance/application/investments";
import type { ApplicationDependencies, IdKind } from "@/modules/finance/application/ports";
import { recordTransaction } from "@/modules/finance/application/transactions";
import {
  clearManualOverride,
  refreshDailyValuations,
  setManualOverride,
  valueNetWorthEur,
  type FxRateProvider,
  type MarketQuoteProvider,
} from "@/modules/finance/application/valuation";
import { seedDatabase } from "@/modules/finance/db/seed";
import { ValuationRepository } from "@/modules/finance/db/repositories/valuation";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

const NOW = new Date("2026-08-30T12:00:00.000Z");

function makeDeps(testDb: TestDatabase, now = NOW): ApplicationDependencies {
  let sequence = 0;
  return {
    unitOfWork: {
      run: (work, config) => testDb.db.transaction((tx) => work(tx), config),
    } satisfies UnitOfWork,
    ids: { nextId: (kind: IdKind) => `${kind}-${++sequence}` },
    clock: { now: () => now },
  };
}

async function insertAutomaticRate(
  testDb: TestDatabase,
  input: { id: string; rate: string; at: Date; currencyCode?: string },
) {
  await testDb.pool.query(
    `insert into finance_exchange_rates
      (id, base_currency_code, quote_currency_code, rate, provider,
       provider_timestamp, retrieved_at, status)
     values ($1, $2, 'EUR', $3, 'nbs', $4, $4, 'valid')`,
    [input.id, input.currencyCode ?? "RSD", input.rate, input.at],
  );
}

describe("valuation application service", () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    await testDb.pool.query("truncate table finance_provider_refresh_runs, finance_journal_transactions, finance_investment_accounts, finance_currencies cascade");
    await seedDatabase(testDb.db);
  });

  afterAll(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("keeps a manual rate effective across automatic inserts and clear reveals the latest valid automatic rate", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "RSD", name: "RSD cash", subtype: "cash",
    });
    await recordTransaction(deps, { accountId: cash.id, amount: "11720", type: "opening_balance" });
    await insertAutomaticRate(testDb, {
      at: new Date("2026-08-30T08:00:00.000Z"), id: "fx-old", rate: "0.0085",
    });

    await setManualOverride(deps, {
      baseCurrencyCode: "RSD", kind: "exchange_rate", quoteCurrencyCode: "EUR", value: "0.01",
    });
    await insertAutomaticRate(testDb, {
      at: new Date("2026-08-30T11:00:00.000Z"), id: "fx-new", rate: "0.009",
    });

    const manual = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 24 * 60 * 60 * 1_000,
      marketDataStaleAfterMs: 24 * 60 * 60 * 1_000,
    });
    expect(manual.totalEur).toBe("117.2");
    expect(manual.accounts.find((account) => account.accountId === cash.id)?.valuation)
      .toMatchObject({ manual: true, source: "manual", value: "0.01" });

    await clearManualOverride(deps, {
      baseCurrencyCode: "RSD", kind: "exchange_rate", quoteCurrencyCode: "EUR",
    });
    const automatic = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 24 * 60 * 60 * 1_000,
      marketDataStaleAfterMs: 24 * 60 * 60 * 1_000,
    });
    expect(automatic.totalEur).toBe("105.48");
    expect(automatic.accounts.find((account) => account.accountId === cash.id)?.valuation)
      .toMatchObject({ manual: false, source: "nbs", value: "0.009" });
  });

  it("treats receivables as assets, liabilities as deductions, and same-currency transfers as neutral", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Cash", subtype: "cash",
    });
    const bank = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Bank", subtype: "bank",
    });
    const receivable = await createAccount(deps, {
      classification: "receivable", currencyCode: "EUR", name: "Receivable", subtype: "loan",
    });
    const card = await createAccount(deps, {
      classification: "liability", currencyCode: "EUR", name: "Card", subtype: "card",
    });
    await recordTransaction(deps, { accountId: cash.id, amount: "100", type: "opening_balance" });
    await recordTransaction(deps, {
      amount: "30", counterparty: "Friend", fromAccountId: cash.id,
      receivableAccountId: receivable.id, type: "receivable_out",
    });
    await recordTransaction(deps, { accountId: card.id, amount: "20", type: "opening_balance" });
    await recordTransaction(deps, { fromAccountId: cash.id, toAccountId: bank.id, amount: "40", type: "transfer" });

    const result = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 1, marketDataStaleAfterMs: 1,
    });

    expect(result.totalEur).toBe("80");
  });

  it("excludes draft and reversed postings while retaining their account at zero balance", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Pending cash", subtype: "cash",
    });
    await testDb.pool.query(
      `insert into finance_journal_transactions (id, type, occurred_at, source, status)
       values
         ('draft-opening', 'opening_balance', $1, 'web', 'draft'),
         ('reversed-opening', 'opening_balance', $1, 'web', 'reversed')`,
      [NOW],
    );
    await testDb.pool.query(
      `insert into finance_journal_postings
         (id, transaction_id, account_id, currency_code, amount)
       values
         ('draft-cash', 'draft-opening', $1, 'EUR', 50),
         ('draft-equity', 'draft-opening', 'system-equity', 'EUR', -50),
         ('reversed-cash', 'reversed-opening', $1, 'EUR', 25),
         ('reversed-equity', 'reversed-opening', 'system-equity', 'EUR', -25)`,
      [cash.id],
    );

    const result = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 1, marketDataStaleAfterMs: 1,
    });

    expect(result.totalEur).toBe("0");
    expect(result.accounts.find((account) => account.accountId === cash.id))
      .toMatchObject({ nativeAmount: "0", eurAmount: "0" });
  });

  it("returns no total and names a missing conversion for a nonzero native balance", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "HUF", name: "HUF cash", subtype: "cash",
    });
    await recordTransaction(deps, { accountId: cash.id, amount: "1000", type: "opening_balance" });

    const result = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 1, marketDataStaleAfterMs: 1,
    });

    expect(result.totalEur).toBeNull();
    expect(result.missingConversions).toContain("HUF");
  });

  it("fetches outside transactions and an invalid refresh cannot erase the last valid rate", async () => {
    let transactionOpen = false;
    const base = makeDeps(testDb);
    const deps: ApplicationDependencies = {
      ...base,
      unitOfWork: {
        run: async (work) => {
          transactionOpen = true;
          try {
            return await testDb.db.transaction((tx) => work(tx));
          } finally {
            transactionOpen = false;
          }
        },
      },
    };
    await insertAutomaticRate(testDb, {
      at: new Date("2026-08-29T08:00:00.000Z"), id: "fx-known-good", rate: "0.0085",
    });
    const provider: FxRateProvider = {
      provider: "nbs",
      async fetchRates() {
        expect(transactionOpen).toBe(false);
        return [{
          baseCurrencyCode: "RSD", provider: "nbs", providerTimestamp: NOW,
          quoteCurrencyCode: "EUR", rate: "-1", retrievedAt: NOW,
        }];
      },
    };

    const refresh = await refreshDailyValuations(deps, {
      fxRateProvider: provider,
      marketQuoteProviders: [],
    });

    expect(refresh).toMatchObject({ failedCount: 2, succeededCount: 0 });
    const rates = await testDb.pool.query<{ id: string; rate: string }>(
      "select id, rate::text from finance_exchange_rates order by provider_timestamp",
    );
    expect(rates.rows).toEqual([{
      id: "fx-known-good", rate: "0.008500000000000000",
    }]);
    await expect(testDb.pool.query(
      "select status, failed_count from finance_provider_refresh_runs where provider = 'nbs'",
    )).resolves.toMatchObject({ rows: [{ status: "failed", failed_count: 2 }] });
  });

  it("reuses position performance and keeps manual market quotes effective until cleared", async () => {
    const deps = makeDeps(testDb);
    const cash = await createAccount(deps, {
      classification: "asset", currencyCode: "EUR", name: "Broker cash", subtype: "broker_cash",
    });
    await testDb.pool.query(
      "insert into finance_investment_accounts (id, name, cash_account_id) values ('broker', 'Broker', $1)",
      [cash.id],
    );
    await recordTransaction(deps, { accountId: cash.id, amount: "1000", type: "opening_balance" });
    await buyInvestment(deps, {
      grossAmount: "100", instrumentId: "instrument-vwce",
      investmentAccountId: "broker", quantity: "10", tradeCurrencyCode: "EUR",
      tradeFxRateToEur: "1",
    });
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('quote-auto', 'instrument-vwce', 'EUR', 15, 'alpha_vantage', $1, $1, 'valid')`,
      [new Date("2026-08-30T10:00:00.000Z")],
    );
    await setManualOverride(deps, {
      instrumentId: "instrument-vwce", kind: "market_quote", quoteCurrencyCode: "EUR", value: "20",
    });

    const manual = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 86_400_000, marketDataStaleAfterMs: 86_400_000,
    });
    expect(manual.totalEur).toBe("1100");
    expect(manual.investments[0]).toMatchObject({
      nativeAmount: "200", eurAmount: "200", quote: { manual: true, value: "20" },
    });

    await clearManualOverride(deps, {
      instrumentId: "instrument-vwce", kind: "market_quote", quoteCurrencyCode: "EUR",
    });
    const automatic = await valueNetWorthEur(deps, {
      exchangeRateStaleAfterMs: 86_400_000, marketDataStaleAfterMs: 86_400_000,
    });
    expect(automatic.totalEur).toBe("1050");
    expect(automatic.investments[0]?.quote).toMatchObject({ manual: false, value: "15" });
  });

  it("values ledger cash and investment lots from one snapshot across an interleaved sale", async () => {
    const setupDeps = makeDeps(testDb);
    const cash = await createAccount(setupDeps, {
      classification: "asset", currencyCode: "EUR", name: "Snapshot broker cash", subtype: "broker_cash",
    });
    await testDb.pool.query(
      "insert into finance_investment_accounts (id, name, cash_account_id) values ('snapshot-broker', 'Snapshot broker', $1)",
      [cash.id],
    );
    await recordTransaction(setupDeps, {
      accountId: cash.id, amount: "1000", type: "opening_balance",
    });
    await buyInvestment(setupDeps, {
      grossAmount: "100", instrumentId: "instrument-vwce",
      investmentAccountId: "snapshot-broker", quantity: "10", tradeCurrencyCode: "EUR",
      tradeFxRateToEur: "1",
    });
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('snapshot-quote', 'instrument-vwce', 'EUR', 20, 'alpha_vantage', $1, $1, 'valid')`,
      [new Date("2026-08-30T10:00:00.000Z")],
    );
    let valuationTransactions = 0;
    let valuationIsolation: string | undefined;
    const valuationDeps: ApplicationDependencies = {
      ...setupDeps,
      unitOfWork: {
        async run(work, config) {
          valuationTransactions += 1;
          valuationIsolation = config?.isolationLevel;
          const result = await testDb.db.transaction((tx) => work(tx), config);
          if (valuationTransactions === 1) {
            await sellInvestment(setupDeps, {
              grossAmount: "200", instrumentId: "instrument-vwce",
              investmentAccountId: "snapshot-broker", quantity: "10", tradeCurrencyCode: "EUR",
              tradeFxRateToEur: "1",
            });
          }
          return result;
        },
      },
    };

    const result = await valueNetWorthEur(valuationDeps, {
      exchangeRateStaleAfterMs: 86_400_000,
      marketDataStaleAfterMs: 86_400_000,
    });

    expect(result.totalEur).toBe("1100");
    expect(valuationTransactions).toBe(1);
    expect(valuationIsolation).toBe("repeatable read");
  });

  it("persists a valid sibling quote when another symbol is invalid and records one failure", async () => {
    const deps = makeDeps(testDb);
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('amd-known-good', 'instrument-amd', 'USD', 90, 'alpha_vantage', $1, $1, 'valid')`,
      [new Date("2026-08-29T10:00:00.000Z")],
    );
    const fxRateProvider: FxRateProvider = {
      provider: "nbs",
      async fetchRates(currencies) {
        return currencies.map((baseCurrencyCode) => ({
          baseCurrencyCode, provider: "nbs", providerTimestamp: NOW,
          quoteCurrencyCode: "EUR", rate: "0.01", retrievedAt: NOW,
        }));
      },
    };
    const marketQuoteProvider: MarketQuoteProvider = {
      provider: "alpha_vantage",
      async fetchQuotes(requests) {
        return {
          quotes: requests.map((request) => ({
            ...request,
            price: request.providerId === "AMD" ? "-1" : "100",
            provider: "alpha_vantage",
            providerTimestamp: NOW,
            retrievedAt: NOW,
          })),
          skippedProviderIds: [],
        };
      },
    };

    const result = await refreshDailyValuations(deps, {
      fxRateProvider,
      marketQuoteProviders: [marketQuoteProvider],
    });

    expect(result.failedCount).toBe(1);
    const quotes = await testDb.pool.query<{ instrument_id: string; price: string }>(
      "select instrument_id, price::text from finance_market_quotes order by provider_timestamp, id",
    );
    expect(quotes.rows).toEqual([
      { instrument_id: "instrument-amd", price: "90.000000000000000000" },
      { instrument_id: "instrument-googl", price: "100.000000000000000000" },
    ]);
    await expect(testDb.pool.query(
      "select status, succeeded_count, failed_count from finance_provider_refresh_runs where provider = 'alpha_vantage'",
    )).resolves.toMatchObject({
      rows: [{ status: "stale", succeeded_count: 1, failed_count: 1 }],
    });
  });

  it("persists an exact Alpha symbol resolution so seeded VWCE enters the same refresh", async () => {
    const deps = makeDeps(testDb);
    const fxRateProvider: FxRateProvider = {
      provider: "nbs",
      async fetchRates(currencies) {
        return currencies.map((baseCurrencyCode) => ({
          baseCurrencyCode, provider: "nbs", providerTimestamp: NOW,
          quoteCurrencyCode: "EUR", rate: "0.01", retrievedAt: NOW,
        }));
      },
    };
    const alphaProvider = {
      provider: "alpha_vantage",
      async resolveSymbol() {
        return { currencyCode: "EUR", providerId: "VWCE.DEX" };
      },
      async fetchQuotes(requests: Array<{
        instrumentId: string;
        providerId: string;
        quoteCurrencyCode: string;
      }>) {
        return {
          quotes: requests.map((request) => ({
            ...request, price: "135.42", provider: "alpha_vantage",
            providerTimestamp: NOW, retrievedAt: NOW,
          })),
          skippedProviderIds: [],
        };
      },
    } satisfies MarketQuoteProvider & {
      resolveSymbol(input: unknown): Promise<{ currencyCode: string; providerId: string }>;
    };

    await refreshDailyValuations(deps, {
      fxRateProvider,
      marketQuoteProviders: [alphaProvider],
    });

    await expect(testDb.pool.query(
      "select provider_id from finance_instruments where id = 'instrument-vwce'",
    )).resolves.toMatchObject({ rows: [{ provider_id: "VWCE.DEX" }] });
    await expect(testDb.pool.query(
      "select price::text from finance_market_quotes where instrument_id = 'instrument-vwce'",
    )).resolves.toMatchObject({ rows: [{ price: "135.420000000000000000" }] });
  });

  it("keeps an allowance-skipped symbol's last quote effective but visibly stale", async () => {
    const deps = makeDeps(testDb);
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('amd-last-known', 'instrument-amd', 'USD', 90, 'alpha_vantage', $1, $1, 'valid')`,
      [new Date("2026-08-30T11:00:00.000Z")],
    );
    const fxRateProvider: FxRateProvider = {
      provider: "nbs",
      async fetchRates(currencies) {
        return currencies.map((baseCurrencyCode) => ({
          baseCurrencyCode, provider: "nbs", providerTimestamp: NOW,
          quoteCurrencyCode: "EUR", rate: "0.01", retrievedAt: NOW,
        }));
      },
    };
    const marketQuoteProvider: MarketQuoteProvider = {
      provider: "alpha_vantage",
      async fetchQuotes(requests) {
        return {
          quotes: requests.filter((request) => request.providerId !== "AMD").map((request) => ({
            ...request, price: "100", provider: "alpha_vantage",
            providerTimestamp: NOW, retrievedAt: NOW,
          })),
          skippedProviderIds: ["AMD"],
        };
      },
    };

    await refreshDailyValuations(deps, {
      fxRateProvider, marketQuoteProviders: [marketQuoteProvider],
    });

    const stored = await testDb.pool.query<{ id: string; status: string }>(
      "select id, status from finance_market_quotes where instrument_id = 'instrument-amd'",
    );
    expect(stored.rows).toEqual([{ id: "amd-last-known", status: "stale" }]);
    const latest = await deps.unitOfWork.run((tx) =>
      new ValuationRepository(tx).latestQuote("instrument-amd", "USD"));
    expect(latest.automatic).toMatchObject({ id: "amd-last-known", price: "90.000000000000000000" });
  });

  it("persists a valid CoinGecko sibling while a missing coin preserves its last-known quote", async () => {
    const deps = makeDeps(testDb);
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('eth-last-known', 'instrument-eth', 'EUR', 4000, 'coingecko', $1, $1, 'valid')`,
      [new Date("2026-08-29T10:00:00.000Z")],
    );
    const fxRateProvider: FxRateProvider = {
      provider: "nbs",
      async fetchRates(currencies) {
        return currencies.map((baseCurrencyCode) => ({
          baseCurrencyCode, provider: "nbs", providerTimestamp: NOW,
          quoteCurrencyCode: "EUR", rate: "0.01", retrievedAt: NOW,
        }));
      },
    };
    const coingecko = new CoinGeckoClient({
      apiKey: "coin-key",
      clock: { now: () => NOW },
      fetch: async () => Response.json({
        bitcoin: { eur: 102345.67, last_updated_at: 1788076740 },
      }),
      signal: new AbortController().signal,
    });

    const result = await refreshDailyValuations(deps, {
      fxRateProvider, marketQuoteProviders: [coingecko],
    });

    expect(result.failedCount).toBe(1);
    await expect(testDb.pool.query(
      "select instrument_id, price::text from finance_market_quotes where provider = 'coingecko' order by instrument_id, provider_timestamp",
    )).resolves.toMatchObject({ rows: [
      { instrument_id: "instrument-btc", price: "102345.670000000000000000" },
      { instrument_id: "instrument-eth", price: "4000.000000000000000000" },
    ] });
    await expect(testDb.pool.query(
      "select status, succeeded_count, failed_count from finance_provider_refresh_runs where provider = 'coingecko'",
    )).resolves.toMatchObject({ rows: [
      { status: "stale", succeeded_count: 1, failed_count: 1 },
    ] });
  });

  it("shares Alpha's 25-request budget across symbol resolution and quote fetches", async () => {
    const deps = makeDeps(testDb);
    for (let index = 1; index <= 23; index += 1) {
      const suffix = String(index).padStart(2, "0");
      await testDb.pool.query(
        `insert into finance_instruments
          (id, symbol, name, class, valuation_method, quote_currency_code, provider, provider_id)
         values ($1, $2, $3, 'stock', 'market_quote', 'USD', 'alpha_vantage', $2)`,
        [`instrument-extra-${suffix}`, `EXTRA${suffix}`, `Extra ${suffix}`],
      );
    }
    await testDb.pool.query(
      `insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status)
       values ('vwce-last-known', 'instrument-vwce', 'EUR', 130, 'alpha_vantage', $1, $1, 'valid')`,
      [new Date("2026-08-29T10:00:00.000Z")],
    );
    const providerCalls: string[] = [];
    const alpha = new AlphaVantageClient({
      apiKey: "alpha-key",
      clock: { now: () => NOW },
      fetch: async (input) => {
        const url = new URL(String(input));
        const functionName = url.searchParams.get("function") ?? "";
        providerCalls.push(functionName);
        if (functionName === "SYMBOL_SEARCH") {
          return Response.json({ bestMatches: [{
            "1. symbol": "VWCE.DEX",
            "2. name": "Vanguard FTSE All-World UCITS ETF",
            "4. region": "Germany",
            "8. currency": "EUR",
          }] });
        }
        const symbol = url.searchParams.get("symbol");
        return Response.json({ "Global Quote": {
          "01. symbol": symbol,
          "05. price": "100",
          "07. latest trading day": "2026-08-28",
        } });
      },
      signal: new AbortController().signal,
    });
    const fxRateProvider: FxRateProvider = {
      provider: "nbs",
      async fetchRates(currencies) {
        return currencies.map((baseCurrencyCode) => ({
          baseCurrencyCode, provider: "nbs", providerTimestamp: NOW,
          quoteCurrencyCode: "EUR", rate: "0.01", retrievedAt: NOW,
        }));
      },
    };

    const result = await refreshDailyValuations(deps, {
      fxRateProvider, marketQuoteProviders: [alpha],
    });

    expect(providerCalls).toHaveLength(25);
    expect(providerCalls.filter((name) => name === "SYMBOL_SEARCH")).toHaveLength(1);
    expect(providerCalls.filter((name) => name === "GLOBAL_QUOTE")).toHaveLength(24);
    expect(result.failedCount).toBe(2);
    await expect(testDb.pool.query(
      "select provider_id from finance_instruments where id = 'instrument-vwce'",
    )).resolves.toMatchObject({ rows: [{ provider_id: "VWCE.DEX" }] });
    await expect(testDb.pool.query(
      "select id, status from finance_market_quotes where instrument_id = 'instrument-vwce'",
    )).resolves.toMatchObject({ rows: [{ id: "vwce-last-known", status: "stale" }] });
  });
});

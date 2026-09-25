import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Decimal from "decimal.js";

import { buildCsvDocument, buildFullExport } from "@/modules/finance/application/exports";
import { createCsvStream } from "@/modules/finance/ui/csv";
import type { UnitOfWork } from "@/modules/finance/db/unit-of-work";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { seedDatabase } from "@/modules/finance/db/seed";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\r" && csv[index + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      cell = "";
      row = [];
      index += 1;
    } else {
      cell += character;
    }
  }
  return rows;
}

describe("full export application service", () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
    await seedDatabase(testDb.db);

    await testDb.pool.query(`
      insert into finance_accounts
        (id, name, classification, subtype, currency_code, is_active, archived_at, created_at, updated_at)
      values
        ('account-archived', 'Stari, račun', 'asset', 'cash', 'EUR', false, '2026-08-20T10:00:00.000Z', '2026-08-01T10:00:00.000Z', '2026-08-20T10:00:00.000Z');
      insert into finance_categories
        (id, name, classification, is_active, archived_at)
      values
        ('category-archived', 'Stara kategorija', 'expense', false, '2026-08-20T10:00:00.000Z');
      insert into finance_journal_transactions
        (id, type, occurred_at, description, source, status, external_reference, created_at)
      values
        ('transaction-1', 'expense', '2026-08-21T10:00:00.000Z', '=Formula,\ntext', 'web', 'posted', 'reference-1', '2026-08-21T10:01:00.000Z');
      insert into finance_journal_postings
        (id, transaction_id, account_id, currency_code, amount, category_id, counterparty, created_at)
      values
        ('posting-1', 'transaction-1', 'account-archived', 'EUR', '-12.340000000000000000', 'category-archived', '@Ana', '2026-08-21T10:01:00.000Z'),
        ('posting-2', 'transaction-1', 'system-expense', 'EUR', '12.340000000000000000', 'category-archived', null, '2026-08-21T10:01:00.000Z');
      insert into finance_budget_limits
        (id, category_id, month, currency_code, amount, created_at, updated_at)
      values
        ('budget-limit-1', 'category-archived', '2026-08-01', 'EUR', '50.000000000000000000', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z');
      insert into finance_budget_periods
        (id, category_id, month, currency_code, limit_amount, carry_in_amount, spending_amount, remaining_amount, recomputed_at)
      values
        ('budget-period-1', 'category-archived', '2026-08-01', 'EUR', '50.000000000000000000', '0.000000000000000000', '12.340000000000000000', '37.660000000000000000', '2026-08-21T10:00:00.000Z');
      insert into finance_goals
        (id, name, account_id, target_currency_code, target_amount, is_active, archived_at, created_at, updated_at)
      values
        ('goal-archived', 'Stari cilj', 'account-archived', 'EUR', '100.000000000000000000', false, '2026-08-20T10:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-20T10:00:00.000Z');
      insert into finance_investment_accounts
        (id, name, cash_account_id, provider, is_active, archived_at, created_at)
      values
        ('investment-account-archived', 'Stari broker', 'account-archived', 'broker', false, '2026-08-20T10:00:00.000Z', '2026-08-01T00:00:00.000Z');
      insert into finance_instruments
        (id, symbol, name, class, valuation_method, quote_currency_code, is_active, archived_at, created_at, updated_at)
      values
        ('instrument-archived', 'OLD', 'Stari instrument', 'stock', 'manual', 'EUR', false, '2026-08-20T10:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-20T10:00:00.000Z');
      insert into finance_investment_transactions
        (id, investment_account_id, instrument_id, journal_transaction_id, type, status, occurred_at, quantity, trade_currency_code, gross_amount, fee_amount, trade_fx_rate_to_eur, created_at)
      values
        ('investment-transaction-1', 'investment-account-archived', 'instrument-archived', 'transaction-1', 'buy', 'posted', '2026-08-21T10:00:00.000Z', '2.500000000000000000000000', 'EUR', '12.340000000000000000', '0.000000000000000000', '1.000000000000000000', '2026-08-21T10:01:00.000Z');
      insert into finance_tax_lots
        (id, investment_transaction_id, instrument_id, acquired_at, quantity, remaining_quantity, cost_currency_code, cost_amount, fee_amount, created_at)
      values
        ('lot-1', 'investment-transaction-1', 'instrument-archived', '2026-08-21T10:00:00.000Z', '2.500000000000000000000000', '2.500000000000000000000000', 'EUR', '12.340000000000000000', '0.000000000000000000', '2026-08-21T10:01:00.000Z');
      insert into finance_journal_transactions
        (id, type, occurred_at, description, source, status, created_at)
      values
        ('transaction-2', 'investment_trade', '2026-08-22T10:00:00.000Z', 'Prodaja', 'web', 'posted', '2026-08-22T10:01:00.000Z');
      insert into finance_journal_postings
        (id, transaction_id, account_id, currency_code, amount, created_at)
      values
        ('posting-3', 'transaction-2', 'account-archived', 'EUR', '5.000000000000000000', '2026-08-22T10:01:00.000Z'),
        ('posting-4', 'transaction-2', 'system-expense', 'EUR', '-5.000000000000000000', '2026-08-22T10:01:00.000Z');
      insert into finance_investment_transactions
        (id, investment_account_id, instrument_id, journal_transaction_id, type, status, occurred_at, quantity, trade_currency_code, gross_amount, fee_amount, trade_fx_rate_to_eur, created_at)
      values
        ('investment-transaction-2', 'investment-account-archived', 'instrument-archived', 'transaction-2', 'sell', 'posted', '2026-08-22T10:00:00.000Z', '1.000000000000000000000000', 'EUR', '5.000000000000000000', '0.000000000000000000', '1.000000000000000000', '2026-08-22T10:01:00.000Z');
      update finance_tax_lots set remaining_quantity = '1.500000000000000000000000' where id = 'lot-1';
      insert into finance_lot_disposals
        (id, tax_lot_id, investment_transaction_id, disposed_at, quantity, proceeds_currency_code, proceeds_amount, cost_basis_amount, created_at)
      values
        ('disposal-1', 'lot-1', 'investment-transaction-2', '2026-08-22T10:00:00.000Z', '1.000000000000000000000000', 'EUR', '5.000000000000000000', '4.936000000000000000', '2026-08-22T10:01:00.000Z');
      insert into finance_exchange_rates
        (id, base_currency_code, quote_currency_code, rate, provider, provider_timestamp, retrieved_at, status, raw_payload)
      values
        ('exchange-rate-1', 'USD', 'EUR', '0.900000000000000000', 'provider', '2026-08-21T10:00:00.000Z', '2026-08-21T10:01:00.000Z', 'valid', '{"providerApiKey":"not-exported"}');
      insert into finance_market_quotes
        (id, instrument_id, quote_currency_code, price, provider, provider_timestamp, retrieved_at, status, raw_payload)
      values
        ('market-quote-1', 'instrument-archived', 'EUR', '4.936000000000000000', 'provider', '2026-08-21T10:00:00.000Z', '2026-08-21T10:01:00.000Z', 'valid', '{"providerApiKey":"not-exported"}');
      insert into finance_manual_valuation_overrides
        (id, kind, instrument_id, value, effective_at, created_at)
      values
        ('manual-override-1', 'market_quote', 'instrument-archived', '5.000000000000000000', '2026-08-21T10:00:00.000Z', '2026-08-21T10:01:00.000Z');
      insert into finance_access_settings (id, kind, token_hash, version, rotated_at)
      values ('access-setting-1', 'web_access_token', 'tokenHash-secret', '1', '2026-08-21T10:00:00.000Z');
      insert into finance_provider_refresh_runs (id, provider, started_at, status, attempted_count)
      values ('refresh-run-1', 'provider', '2026-08-21T10:00:00.000Z', 'valid', 1);
    `);
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("exports whitelisted domain records with stable relationships, archived data, decimal strings, and no secrets", async () => {
    let accessMode: string | undefined;
    let isolationLevel: string | undefined;
    const exported = await buildFullExport({
      clock: { now: () => new Date("2026-08-22T12:00:00.000Z") },
      unitOfWork: {
        run: (work, config) => {
          accessMode = config?.accessMode;
          isolationLevel = config?.isolationLevel;
          return testDb.db.transaction((tx) => work(tx), config);
        },
      } satisfies UnitOfWork,
    });

    expect(exported.meta).toEqual({
      exportedAt: "2026-08-22T12:00:00.000Z",
      reportingCurrencyCode: "EUR",
      schemaVersion: 1,
    });
    expect(accessMode).toBe("read only");
    expect(isolationLevel).toBe("repeatable read");
    expect(exported.journalPostings.find((posting) => posting.id === "posting-1"))
      .toMatchObject({
        accountId: "account-archived",
        amount: "-12.340000000000000000",
        categoryId: "category-archived",
        transactionId: "transaction-1",
      });
    expect(exported.journalTransactions.find((transaction) => transaction.id === "transaction-1"))
      .toMatchObject({ occurredAt: "2026-08-21T10:00:00.000Z" });
    expect(exported.accounts).toContainEqual(expect.objectContaining({
      archivedAt: "2026-08-20T10:00:00.000Z",
      id: "account-archived",
    }));
    expect(exported.goals).toContainEqual(expect.objectContaining({ id: "goal-archived" }));
    expect(exported.investmentAccounts).toContainEqual(expect.objectContaining({ id: "investment-account-archived" }));
    expect(exported.instruments).toContainEqual(expect.objectContaining({ id: "instrument-archived" }));
    expect(exported.taxLots).toContainEqual(expect.objectContaining({
      id: "lot-1",
      investmentTransactionId: "investment-transaction-1",
    }));
    expect(JSON.stringify(exported)).not.toMatch(/tokenHash|session|CRON_SECRET|providerApiKey|rawPayload|providerRefreshRun/);
  });

  async function document(dataset: Parameters<typeof buildCsvDocument>[1]) {
    const dependencies = {
      clock: { now: () => new Date("2026-08-22T12:00:00.000Z") },
      unitOfWork: {
        run: (work, config) => testDb.db.transaction((tx) => work(tx), config),
      } satisfies UnitOfWork,
    };
    return buildCsvDocument(dependencies, dataset);
  }

  it("streams bounded transaction rows with enough detail to reconcile each journal currency", async () => {
    const documentForTransactions = await document("transactions");
    const csv = await new Response(createCsvStream(
      documentForTransactions.headers,
      documentForTransactions.rows,
    )).text();

    expect(Symbol.asyncIterator in documentForTransactions.rows).toBe(true);
    expect(documentForTransactions.headers).toEqual([
      "ID transakcije",
      "Datum",
      "Tip",
      "Status",
      "Opis",
      "Izvor",
      "ID stavke",
      "ID računa",
      "Valuta",
      "Iznos",
      "ID kategorije",
      "Druga strana",
    ]);
    const [header, ...rows] = parseCsv(csv);
    const fields = Object.fromEntries(header.map((name, index) => [name, index]));
    const amounts = new Map<string, Decimal>();
    for (const row of rows) {
      const key = `${row[fields["ID transakcije"]]}:${row[fields.Valuta]}`;
      amounts.set(key, (amounts.get(key) ?? new Decimal(0)).plus(row[fields.Iznos] ?? "0"));
    }
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row[fields["ID stavke"]])).toEqual([
      "posting-1", "posting-2", "posting-3", "posting-4",
    ]);
    expect([...amounts.entries()]).toEqual([
      ["transaction-1:EUR", new Decimal(0)],
      ["transaction-2:EUR", new Decimal(0)],
    ]);
  });

  it("releases the repeatable-read export transaction when a CSV response is cancelled", async () => {
    let resolveSettled: () => void;
    const settled = new Promise<void>((resolve) => { resolveSettled = resolve; });
    const documentForAccounts = await buildCsvDocument({
      clock: { now: () => new Date("2026-08-22T12:00:00.000Z") },
      unitOfWork: {
        run: async (work, config) => {
          try {
            return await testDb.db.transaction((tx) => work(tx), config);
          } finally {
            resolveSettled();
          }
        },
      } satisfies UnitOfWork,
    }, "accounts");
    const reader = createCsvStream(
      documentForAccounts.headers,
      documentForAccounts.rows,
    ).getReader();

    expect(await reader.read()).toMatchObject({ done: false, value: expect.any(Uint8Array) });
    await reader.cancel("download-abandoned");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        settled,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error("export_transaction_did_not_settle")), 500);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });

  it("exports exact account, budget, and goal columns with persisted records", async () => {
    const [accounts, budgets, goals] = await Promise.all([
      document("accounts"), document("budgets"), document("goals"),
    ]);

    expect(accounts.headers).toEqual(["ID računa", "Naziv", "Klasifikacija", "Podtip", "Valuta", "Sistemski", "Aktivan", "Arhiviran", "Kreiran", "Ažuriran"]);
    expect(await new Response(createCsvStream(accounts.headers, accounts.rows)).text()).toContain(
      "account-archived,\"Stari, račun\",asset,cash,EUR,false,false,2026-08-20T10:00:00.000Z,2026-08-01T10:00:00.000Z,2026-08-20T10:00:00.000Z\r\n",
    );
    expect(budgets.headers).toEqual(["ID limita", "ID perioda", "ID kategorije", "Mesec", "Valuta", "Limit", "Prenos", "Potrošnja", "Preostalo", "Preračunato"]);
    expect(await new Response(createCsvStream(budgets.headers, budgets.rows)).text()).toContain(
      "budget-limit-1,budget-period-1,category-archived,2026-08-01,EUR,50.000000000000000000,0.000000000000000000,12.340000000000000000,37.660000000000000000,2026-08-21T10:00:00.000Z\r\n",
    );
    expect(goals.headers).toEqual(["ID cilja", "Naziv", "ID računa", "Valuta cilja", "Ciljni iznos", "Aktivan", "Arhiviran", "Kreiran", "Ažuriran"]);
    expect(await new Response(createCsvStream(goals.headers, goals.rows)).text()).toContain(
      "goal-archived,Stari cilj,account-archived,EUR,100.000000000000000000,false,2026-08-20T10:00:00.000Z,2026-08-01T00:00:00.000Z,2026-08-20T10:00:00.000Z\r\n",
    );
  });

  it("exports positions, lots, and activity with buy/sell and disposal relationships", async () => {
    const positions = await document("positions");

    expect(positions.headers).toEqual(["ID investicionog računa", "ID instrumenta", "Količina", "Valuta kotacije"]);
    expect(await new Response(createCsvStream(positions.headers, positions.rows)).text()).toContain(
      "investment-account-archived,instrument-archived,1.500000000000000000000000,EUR\r\n",
    );
    const lots = await document("lots");
    expect(lots.headers).toEqual(["ID lota", "ID investicione transakcije", "ID instrumenta", "Datum sticanja", "Količina", "Preostala količina", "Valuta troška", "Trošak", "Naknada", "ID raspolaganja", "ID prodajne transakcije", "Datum raspolaganja", "Prodata količina", "Valuta prihoda", "Prihod", "Troškovna osnova", "Kreiran"]);
    expect(await new Response(createCsvStream(lots.headers, lots.rows)).text()).toContain(
      "lot-1,investment-transaction-1,instrument-archived,2026-08-21T10:00:00.000Z,2.500000000000000000000000,1.500000000000000000000000,EUR,12.340000000000000000,0.000000000000000000,disposal-1,investment-transaction-2,2026-08-22T10:00:00.000Z,1.000000000000000000000000,EUR,5.000000000000000000,4.936000000000000000,2026-08-21T10:01:00.000Z\r\n",
    );
    const activity = await document("investment-activity");
    expect(activity.headers).toEqual(["ID investicione transakcije", "ID investicionog računa", "ID instrumenta", "ID journal transakcije", "Tip", "Status", "Datum", "Količina", "Valuta trgovine", "Bruto iznos", "Naknada", "Kurs prema EUR", "Korekcija od", "Koregovano sa", "Kreiran"]);
    const activityCsv = await new Response(createCsvStream(activity.headers, activity.rows)).text();
    expect(activityCsv).toContain("investment-transaction-1,investment-account-archived,instrument-archived,transaction-1,buy,posted,2026-08-21T10:00:00.000Z,2.500000000000000000000000,EUR,12.340000000000000000,0.000000000000000000,1.000000000000000000,,,2026-08-21T10:01:00.000Z\r\n");
    expect(activityCsv).toContain("investment-transaction-2,investment-account-archived,instrument-archived,transaction-2,sell,posted,2026-08-22T10:00:00.000Z,1.000000000000000000000000,EUR,5.000000000000000000,0.000000000000000000,1.000000000000000000,,,2026-08-22T10:01:00.000Z\r\n");
  });
});

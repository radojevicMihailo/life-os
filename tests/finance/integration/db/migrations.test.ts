import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase,
  TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS,
  type TestDatabase,
} from "../support/database";

async function tableNames(testDb: TestDatabase) {
  const result = await testDb.pool.query<{ table_name: string }>(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name`,
  );

  return result.rows.map((row) => row.table_name);
}

async function columnType(testDb: TestDatabase, table: string, column: string) {
  const result = await testDb.pool.query<{
    data_type: string;
    datetime_precision: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
    is_nullable: string;
  }>(
    `select data_type, datetime_precision, numeric_precision, numeric_scale,
            is_nullable
       from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2`,
    [table, column],
  );

  return result.rows.at(0);
}

async function constraintNames(testDb: TestDatabase, table: string) {
  const result = await testDb.pool.query<{ conname: string }>(
    `select conname
       from pg_constraint
      where conrelid = $1::regclass
      order by conname`,
    [table],
  );

  return result.rows.map((row) => row.conname);
}

async function indexNames(testDb: TestDatabase) {
  const result = await testDb.pool.query<{ indexname: string }>(
    `select indexname
       from pg_indexes
      where schemaname = 'public'
      order by indexname`,
  );

  return result.rows.map((row) => row.indexname);
}

async function triggerNames(testDb: TestDatabase, table: string) {
  const result = await testDb.pool.query<{ tgname: string }>(
    `select tgname
       from pg_trigger
      where tgrelid = $1::regclass
        and not tgisinternal
      order by tgname`,
    [table],
  );

  return result.rows.map((row) => row.tgname);
}

async function insertPostedJournalFixture(testDb: TestDatabase) {
  await testDb.pool.query(
    `insert into finance_currencies (code, name, minor_unit)
     values ('EUR', 'Euro', '2')`,
  );
  await testDb.pool.query(
    `insert into finance_accounts (id, name, classification, subtype, currency_code, is_system)
     values ('cash-eur', 'Cash EUR', 'asset', 'cash', 'EUR', false)`,
  );
  await testDb.pool.query(
    `insert into finance_journal_transactions (id, type, occurred_at, description, source, status)
     values ('posted-tx', 'income', '2026-08-22T10:00:00.000Z', 'Original', 'web', 'posted')`,
  );
  await testDb.pool.query(
    `insert into finance_journal_postings (id, transaction_id, account_id, currency_code, amount)
     values ('posted-posting', 'posted-tx', 'cash-eur', 'EUR', '1.00')`,
  );
}

describe("database migrations", () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = await createTestDatabase();
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await testDb?.close();
  }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("migrates an empty PostgreSQL database", async () => {
    await migrateDatabase(testDb.db);

    expect(await tableNames(testDb)).toEqual(
      expect.arrayContaining([
        "finance_accounts",
        "finance_journal_transactions",
        "finance_journal_postings",
        "finance_instruments",
        "finance_tax_lots",
      ]),
    );
  });

  it("creates the required precision, constraints, indexes, and triggers", async () => {
    await migrateDatabase(testDb.db);
    await testDb.pool.query(
      `insert into finance_currencies (code, name, minor_unit)
       values ('EUR', 'Euro', '2')`,
    );

    await expect(
      testDb.pool.query(
        `insert into finance_accounts (id, name, classification, subtype, currency_code, is_system)
         values ('bad-classification', 'Bad', 'cash', 'manual', 'EUR', false)`,
      ),
    ).rejects.toThrow();

    const moneyType = await columnType(testDb, "finance_journal_postings", "amount");
    expect(moneyType).toMatchObject({
      data_type: "numeric",
      numeric_precision: 38,
      numeric_scale: 18,
    });

    const quantityType = await columnType(testDb, "finance_tax_lots", "quantity");
    expect(quantityType).toMatchObject({
      data_type: "numeric",
      numeric_precision: 48,
      numeric_scale: 24,
    });

    const tradeFxType = await columnType(
      testDb,
      "finance_investment_transactions",
      "trade_fx_rate_to_eur",
    );
    expect(tradeFxType).toMatchObject({
      data_type: "numeric",
      is_nullable: "NO",
      numeric_precision: 38,
      numeric_scale: 18,
    });

    const occurredAtType = await columnType(
      testDb,
      "finance_journal_transactions",
      "occurred_at",
    );
    expect(occurredAtType).toMatchObject({
      data_type: "timestamp with time zone",
    });

    expect(await constraintNames(testDb, "finance_journal_postings")).toEqual(
      expect.arrayContaining([
        "journal_postings_amount_nonzero_check",
        "journal_postings_transaction_id_journal_transactions_id_fk",
      ]),
    );
    expect(await constraintNames(testDb, "finance_accounts")).toEqual(
      expect.arrayContaining([
        "accounts_archived_at_consistency_check",
        "accounts_classification_check",
      ]),
    );
    expect(await triggerNames(testDb, "finance_journal_transactions")).toContain(
      "trg_prevent_posted_journal_transaction_update",
    );
    expect(await triggerNames(testDb, "finance_journal_postings")).toContain(
      "trg_prevent_posted_journal_posting_change",
    );
    expect(await indexNames(testDb)).toEqual(
      expect.arrayContaining([
        "accounts_active_name_unique_idx",
        "journal_transactions_occurred_at_idx",
        "journal_postings_account_occurred_idx",
        "budget_periods_recompute_idx",
        "tax_lots_open_fifo_idx",
        "market_quotes_lookup_idx",
        "access_settings_kind_unique_idx",
        "idempotency_records_scope_key_idx",
      ]),
    );
  });

  it("fails the NOT NULL FX migration when legacy investment history contains null", async () => {
    const initialSql = await readFile(
      resolve(process.cwd(), "db/unified-migrations/0001_finance.sql"),
      "utf8",
    );
    const notNullMigration = 'ALTER TABLE "finance_investment_transactions" ALTER COLUMN "trade_fx_rate_to_eur" SET NOT NULL;';
    expect(initialSql.trimEnd().endsWith(notNullMigration)).toBe(true);
    await testDb.pool.query(initialSql.slice(0, initialSql.lastIndexOf(notNullMigration)));
    await testDb.pool.query(
      `insert into finance_currencies (code, name, minor_unit, is_active, activated_at)
       values ('EUR', 'Euro', '2', true, now())`,
    );
    await testDb.pool.query(
      `insert into finance_accounts
         (id, name, classification, subtype, currency_code, is_system)
       values ('legacy-cash', 'Legacy cash', 'asset', 'cash', 'EUR', false)`,
    );
    await testDb.pool.query(
      `insert into finance_instruments
         (id, symbol, name, class, quote_currency_code)
       values ('legacy-instrument', 'LEGACY', 'Legacy', 'stock', 'EUR')`,
    );
    await testDb.pool.query(
      `insert into finance_investment_accounts (id, name, cash_account_id)
       values ('legacy-broker', 'Legacy broker', 'legacy-cash')`,
    );
    await testDb.pool.query(
      `insert into finance_investment_transactions
         (id, investment_account_id, instrument_id, type, occurred_at,
          trade_currency_code, trade_fx_rate_to_eur)
       values ('legacy-buy', 'legacy-broker', 'legacy-instrument', 'buy', now(),
               'EUR', null)`,
    );

    await expect(migrateDatabase(testDb.db)).rejects.toThrow(/null/i);
  });

  it("rejects duplicate access settings for the same kind", async () => {
    await migrateDatabase(testDb.db);

    await testDb.pool.query(
      `insert into finance_access_settings (id, kind, token_hash, version, rotated_at)
       values ('web-access-token-current', 'web_access_token', 'hash-a', '1', now())`,
    );

    await expect(
      testDb.pool.query(
        `insert into finance_access_settings (id, kind, token_hash, version, rotated_at)
         values ('web-access-token-stale', 'web_access_token', 'hash-b', '2', now())`,
      ),
    ).rejects.toThrow();
  });

  it("rejects direct mutation and deletion of posted journal transactions", async () => {
    await migrateDatabase(testDb.db);
    await insertPostedJournalFixture(testDb);

    await expect(
      testDb.pool.query(
        `update finance_journal_transactions
            set status = 'reversed'
          where id = 'posted-tx'`,
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      testDb.pool.query(
        `update finance_journal_transactions
            set description = 'Changed'
          where id = 'posted-tx'`,
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      testDb.pool.query(
        `delete from finance_journal_transactions
          where id = 'posted-tx'`,
      ),
    ).rejects.toThrow(/immutable/);
  });

  it("rejects the status-transition bypass before posted journal posting changes", async () => {
    await migrateDatabase(testDb.db);
    await insertPostedJournalFixture(testDb);

    await expect(
      testDb.pool.query(
        `update finance_journal_transactions
            set status = 'reversed'
          where id = 'posted-tx'`,
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      testDb.pool.query(
        `update finance_journal_postings
            set amount = '2.00'
          where id = 'posted-posting'`,
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      testDb.pool.query(
        `delete from finance_journal_postings
          where id = 'posted-posting'`,
      ),
    ).rejects.toThrow(/immutable/);
  });
});

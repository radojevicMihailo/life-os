import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { archiveAccount, createAccount, restoreAccount, updateAccount } from "@/modules/finance/application/accounts";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { seedDatabase } from "@/modules/finance/db/seed";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import {
  createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS,
  TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase,
} from "../support/database";

describe("account editing and restoration", () => {
  let testDb: TestDatabase;
  let deps: ApplicationDependencies;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    await migrateDatabase(testDb.db);
    await seedDatabase(testDb.db);
    deps = {
      unitOfWork: { run: (work) => testDb.db.transaction((tx) => work(tx)) },
      ids: { nextId: () => "account-edit-test" },
      clock: { now: () => new Date("2026-09-29T12:00:00Z") },
    };
  }, TEST_DATABASE_HOOK_TIMEOUT_MS);

  afterEach(async () => { await testDb?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);

  it("edits an unused account and restores it after archiving", async () => {
    const account = await createAccount(deps, {
      name: "Original", classification: "asset", subtype: "cash", currencyCode: "EUR",
    });
    const edited = await updateAccount(deps, {
      id: account.id, name: "New name", classification: "liability",
      subtype: "credit", currencyCode: "USD",
    });
    expect(edited).toMatchObject({ name: "New name", classification: "liability", subtype: "credit", currencyCode: "USD" });

    await archiveAccount(deps, { id: account.id });
    const restored = await restoreAccount(deps, { id: account.id });
    expect(restored).toMatchObject({ id: account.id, isActive: true, archivedAt: null });
    const { rows } = await testDb.pool.query("select name, classification, subtype, currency_code, is_active, archived_at from finance_accounts where id = $1", [account.id]);
    expect(rows[0]).toMatchObject({ name: "New name", classification: "liability", subtype: "credit", currency_code: "USD", is_active: true, archived_at: null });
  });

  it("preserves ledger meaning once an account has a posting", async () => {
    const account = await createAccount(deps, {
      name: "Used", classification: "asset", subtype: "cash", currencyCode: "EUR",
    });
    await testDb.pool.query("insert into finance_journal_transactions (id, type, source, status, occurred_at, created_at) values ('tx-edit-test', 'opening_balance', 'web', 'posted', now(), now())");
    await testDb.pool.query("insert into finance_journal_postings (id, transaction_id, account_id, amount, currency_code) values ('posting-edit-test', 'tx-edit-test', $1, 10, 'EUR')", [account.id]);

    await expect(updateAccount(deps, {
      id: account.id, name: "Renamed", classification: "asset", subtype: "bank", currencyCode: "USD",
    })).rejects.toMatchObject({ code: "account_details_in_use" });
    const renamed = await updateAccount(deps, {
      id: account.id, name: "Renamed", classification: "asset", subtype: "bank", currencyCode: "EUR",
    });
    expect(renamed).toMatchObject({ name: "Renamed", subtype: "bank", currencyCode: "EUR" });
  });
});

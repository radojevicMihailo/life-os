import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { archiveAccount, createAccount, deleteAccount, restoreAccount, updateAccount } from "@/modules/finance/application/accounts";
import {listAccounts} from "@/modules/finance/read-models/accounts";
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

  it.each([false,true])("deletes an unused account even when archived=%s",async archived=>{
    const account=await createAccount(deps,{name:"Unused",classification:"asset",subtype:"cash",currencyCode:"EUR"});
    if(archived)await archiveAccount(deps,{id:account.id});
    const view=await listAccounts(deps,{exchangeRateStaleAfterMs:86400000,marketDataStaleAfterMs:86400000});
    expect(view.groups.asset.find(a=>a.id===account.id)?.canDelete).toBe(true);
    await deleteAccount(deps,{id:account.id});
    expect((await testDb.pool.query("select id from finance_accounts where id=$1",[account.id])).rowCount).toBe(0);
  });

  it("rejects deleting an account with postings even when its balance is zero",async()=>{
    const account=await createAccount(deps,{name:"Used",classification:"asset",subtype:"cash",currencyCode:"EUR"});
    await testDb.pool.query("insert into finance_journal_transactions(id,type,source,status,occurred_at,created_at) values('delete-test-tx','opening_balance','web','posted',now(),now())");
    await testDb.pool.query("insert into finance_journal_postings(id,transaction_id,account_id,amount,currency_code) values('delete-positive','delete-test-tx',$1,10,'EUR'),('delete-negative','delete-test-tx',$1,-10,'EUR')",[account.id]);
    const view=await listAccounts(deps,{exchangeRateStaleAfterMs:86400000,marketDataStaleAfterMs:86400000});
    expect(view.groups.asset.find(a=>a.id===account.id)?.canDelete).toBe(false);
    await expect(deleteAccount(deps,{id:account.id})).rejects.toMatchObject({code:"account_delete_in_use"});
    expect((await testDb.pool.query("select id from finance_accounts where id=$1",[account.id])).rowCount).toBe(1);
    expect((await testDb.pool.query("select id from finance_journal_postings where account_id=$1",[account.id])).rowCount).toBe(2);
  });

  it.each(["goal","purpose","investment"])("preserves an account linked to a %s",async kind=>{
    const account=await createAccount(deps,{name:"Linked",classification:"asset",subtype:"cash",currencyCode:"EUR"});
    if(kind==="goal"||kind==="purpose")await testDb.pool.query("insert into finance_goals(id,name,account_id,target_currency_code,target_amount) values('delete-test-goal','Goal',$1,'EUR',100)",[account.id]);
    if(kind==="purpose"){
      await testDb.pool.query("update finance_goals set account_id=null where id='delete-test-goal'");
      await testDb.pool.query("insert into finance_account_purposes(id,account_id,goal_id,currency_code,amount) values('delete-test-purpose',$1,'delete-test-goal','EUR',10)",[account.id]);
    }
    if(kind==="investment")await testDb.pool.query("insert into finance_investment_accounts(id,name,cash_account_id,provider) values('delete-test-investment','Broker',$1,'broker')",[account.id]);
    const view=await listAccounts(deps,{exchangeRateStaleAfterMs:86400000,marketDataStaleAfterMs:86400000});
    expect(view.groups.asset.find(a=>a.id===account.id)?.canDelete).toBe(false);
    await expect(deleteAccount(deps,{id:account.id})).rejects.toMatchObject({code:"account_delete_in_use"});
    expect((await testDb.pool.query("select id from finance_accounts where id=$1",[account.id])).rowCount).toBe(1);
  });

  it("does not delete system accounts or treat missing accounts as successful",async()=>{
    await expect(deleteAccount(deps,{id:"system-income"})).rejects.toMatchObject({code:"account_system_delete_forbidden"});
    await expect(deleteAccount(deps,{id:"missing-account"})).rejects.toMatchObject({code:"account_not_found"});
  });

});

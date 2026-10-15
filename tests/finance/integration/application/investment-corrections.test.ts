import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAccount } from "@/modules/finance/application/accounts";
import { buyInvestment, sellInvestment, recordOpeningLot, createInvestmentAccount } from "@/modules/finance/application/investments";
import { correctInvestmentTransaction } from "@/modules/finance/application/investment-corrections";
import { listInvestments } from "@/modules/finance/read-models/investments";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { seedDatabase } from "@/modules/finance/db/seed";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";

describe("investment corrections", () => {
  let db: TestDatabase;
  let deps: ApplicationDependencies;
  let broker: string;
  let cash: string;
  const base = { instrumentId: "instrument-vwce", quantity: "4", grossAmount: "400", feeAmount: "0", tradeCurrencyCode: "EUR", tradeFxRateToEur: "1", occurredAt: new Date("2026-01-01T12:00:00Z") };
  beforeAll(async () => { db = await createTestDatabase(); await migrateDatabase(db.db); }, TEST_DATABASE_HOOK_TIMEOUT_MS);
  beforeEach(async () => {
    await db.pool.query("truncate table finance_journal_transactions, finance_investment_accounts, finance_categories, finance_currencies cascade");
    await seedDatabase(db.db);
    deps = { unitOfWork: { run: (work) => db.db.transaction(work) }, ids: { nextId: () => randomUUID() }, clock: { now: () => new Date("2026-08-01T12:00:00Z") } };
    const account = await createAccount(deps, { classification: "asset", currencyCode: "EUR", name: "Broker", subtype: "broker_cash" });
    cash = account.id;
    broker = (await createInvestmentAccount(deps, { name: "Broker", cashAccountId: cash })).id;
  });
  afterAll(async () => { await db?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);
  async function balance(id = cash) {
    return (await db.pool.query("select coalesce(sum(amount),0)::float8 balance from finance_journal_postings where account_id=$1", [id])).rows[0].balance;
  }
  async function disposals() {
    return (await db.pool.query(`select d.investment_transaction_id id, sum(d.quantity)::float8 quantity, sum(d.cost_basis_amount)::float8 basis, sum(d.proceeds_amount)::float8 proceeds from finance_lot_disposals d join finance_investment_transactions t on t.id=d.investment_transaction_id where t.status='posted' group by d.investment_transaction_id`)).rows;
  }
  it("corrects a partially sold opening without inventing cash and rebuilds sale basis", async () => {
    const opening = await recordOpeningLot(deps, { investmentAccountId: broker, instrumentId: base.instrumentId, quantity: "4", acquiredAt: base.occurredAt, price: "100", currencyCode: "EUR", fees: "0", tradeFxRateToEur: "1" });
    const sale = await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "150", occurredAt: new Date("2026-02-01") });
    const replacement = await correctInvestmentTransaction(deps, { ...base, originalId: opening.id, investmentAccountId: broker, quantity: "5", grossAmount: "1000" });
    expect(await balance()).toBe(150);
    expect(await disposals()).toEqual([{ id: sale.id, quantity: 1, basis: 200, proceeds: 150 }]);
    expect((await db.pool.query("select status,corrected_by_id from finance_investment_transactions where id=$1", [opening.id])).rows[0]).toEqual({ status: "reversed", corrected_by_id: replacement.id });
    expect((await db.pool.query("select count(*)::int count from finance_journal_transactions")).rows[0].count).toBe(1);
  });
  it("corrects a buy and historical sale, updating cash and all later FIFO allocations", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker });
    const first = await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "150", occurredAt: new Date("2026-02-01") });
    const later = await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "180", occurredAt: new Date("2026-03-01") });
    await correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: buy.id, quantity: "5", grossAmount: "1000" });
    const edited = await correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: first.id, quantity: "2", grossAmount: "350", occurredAt: new Date("2026-04-01") });
    expect(await balance()).toBe(-470);
    expect(await disposals()).toEqual(expect.arrayContaining([{ id: edited.id, quantity: 2, basis: 400, proceeds: 350 }, { id: later.id, quantity: 1, basis: 200, proceeds: 180 }]));
  });
  it("shows only active replacements in portfolio history and lots, with recalculated realized return", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker });
    const sale = await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "150", occurredAt: new Date("2026-02-01") });
    const edited = await correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: buy.id, quantity: "5", grossAmount: "1000" });
    const model = await listInvestments(deps, { exchangeRateStaleAfterMs: 36 * 3600000, marketDataStaleAfterMs: 36 * 3600000 });
    expect(model.positions.map((row) => row.quantity)).toEqual(["4"]);
    expect(model.lots).toHaveLength(1);
    expect(model.lots[0]).toMatchObject({ quantity: "5", remainingQuantity: "4", costAmount: "1000" });
    expect(model.activity.map((row) => row.id).sort()).toEqual([sale.id, edited.id].sort());
    expect(model.totals.realizedReturnEur).toBe("-50");
  });
  it("rolls back every correction record and cash posting if any historical sale oversells", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker });
    await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "3", grossAmount: "450", occurredAt: new Date("2026-02-01") });
    const before = await disposals();
    await expect(correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: buy.id, quantity: "2" })).rejects.toMatchObject({ code: "investment_quantity_insufficient" });
    expect(await balance()).toBe(50);
    expect(await disposals()).toEqual(before);
    expect((await db.pool.query("select count(*)::int count from finance_investment_transactions")).rows[0].count).toBe(2);
  });
  it("serializes concurrent edits and permits editing the replacement again", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker });
    const input = { ...base, investmentAccountId: broker, originalId: buy.id, grossAmount: "500", preserveTimeOnSameDate: true, occurredAt: new Date("2026-01-01T00:00:00Z") };
    const results = await Promise.allSettled([correctInvestmentTransaction(deps, input), correctInvestmentTransaction(deps, input)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "investment_transaction_already_corrected" } });
    const result = results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>;
    expect((await db.pool.query("select occurred_at from finance_investment_transactions where id=$1", [result.value.id])).rows[0].occurred_at).toEqual(base.occurredAt);
    await correctInvestmentTransaction(deps, { ...input, originalId: result.value.id, grossAmount: "600" });
    expect(await balance()).toBe(-600);
  });
  it("moves a buy to another account, instrument and cash currency without affecting an unrelated lot", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker });
    const unrelated = await buyInvestment(deps, { ...base, investmentAccountId: broker, instrumentId: "instrument-btc" });
    const otherCash = await createAccount(deps, { classification: "asset", currencyCode: "HUF", name: "HUF", subtype: "broker_cash" });
    const other = await createInvestmentAccount(deps, { name: "Other", cashAccountId: otherCash.id });
    await correctInvestmentTransaction(deps, { ...base, originalId: buy.id, investmentAccountId: other.id, instrumentId: "instrument-googl", grossAmount: "40000", tradeCurrencyCode: "HUF", tradeFxRateToEur: "0.0025" });
    expect(await balance()).toBe(-400);
    expect(await balance(otherCash.id)).toBe(-40000);
    expect((await db.pool.query("select remaining_quantity::float8 quantity from finance_tax_lots where id=$1", [unrelated.lotId])).rows[0].quantity).toBe(4);
  });
  it("rejects moving acquisition after its historical sale and preserves all cash and allocations", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker });
    await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "150", occurredAt: new Date("2026-02-01") });
    const before = await disposals();
    await expect(correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: buy.id, occurredAt: new Date("2026-03-01") })).rejects.toMatchObject({ code: "investment_quantity_insufficient" });
    expect(await balance()).toBe(-250);
    expect(await disposals()).toEqual(before);
  });
  it("rejects a correction that would mix acquisition and sale currencies", async () => {
    const opening = await recordOpeningLot(deps, { investmentAccountId: broker, instrumentId: base.instrumentId, quantity: "4", acquiredAt: base.occurredAt, price: "100", currencyCode: "EUR", fees: "0", tradeFxRateToEur: "1" });
    await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "150", occurredAt: new Date("2026-02-01") });
    await expect(correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: opening.id, tradeCurrencyCode: "HUF", tradeFxRateToEur: "0.0025" })).rejects.toMatchObject({ code: "investment_trade_currency_mismatch" });
    expect(await balance()).toBe(150);
  });
  it("retains equal-time lot order after correction and in subsequent ordinary sales", async () => {
    const first = await buyInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "100" });
    const second = await buyInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "300" });
    // Existing FIFO breaks equal-time ties by original lot id, whichever was entered first.
    const originalFirst = first.lotId.localeCompare(second.lotId) < 0 ? first : second;
    const expectedBasis = originalFirst === first ? 100 : 300;
    await correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: originalFirst.id, quantity: "1", grossAmount: String(expectedBasis) });
    const sale = await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "500", occurredAt: new Date("2026-02-01") });
    expect(sale.costBasis).toBe(String(expectedBasis));
  });

  it("carries exact disposed basis through replay and assigns the rounding remainder on final close", async () => {
    const buy = await buyInvestment(deps, { ...base, investmentAccountId: broker, quantity: "3", grossAmount: "3" });
    for (const month of [2, 3, 4]) {
      await sellInvestment(deps, { ...base, investmentAccountId: broker, quantity: "1", grossAmount: "2", occurredAt: new Date(`2026-0${month}-01`) });
    }
    await correctInvestmentTransaction(deps, { ...base, investmentAccountId: broker, originalId: buy.id, quantity: "3", grossAmount: "1" });
    expect((await db.pool.query(`select sum(d.cost_basis_amount)::text basis from finance_lot_disposals d join finance_investment_transactions s on s.id=d.investment_transaction_id where s.status='posted'`)).rows[0].basis).toBe("1.000000000000000000");
    expect((await db.pool.query(`select d.cost_basis_amount::text basis from finance_lot_disposals d where d.disposed_at='2026-04-01'`)).rows[0].basis).toBe("0.333333333333333334");
  });

});

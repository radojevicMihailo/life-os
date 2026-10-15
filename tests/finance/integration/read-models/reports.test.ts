import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase, type TestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS } from "../support/database";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { seedDatabase } from "@/modules/finance/db/seed";
import { createAccount, archiveAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import { recordTransaction, correctTransaction } from "@/modules/finance/application/transactions";
import { getMonthlyReports } from "@/modules/finance/read-models/reports";
import { correctInvestmentTransaction } from "@/modules/finance/application/investment-corrections";
import { computeMonthlyReport } from "@/modules/finance/read-models/reports";
import { HistoryRepository } from "@/modules/finance/db/repositories/history";
import { buyInvestment, recordOpeningLot } from "@/modules/finance/application/investments";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
const options = { exchangeRateStaleAfterMs: 86400000 * 40, marketDataStaleAfterMs: 86400000 * 40 };
describe("historical monthly reports", () => {
    let db: TestDatabase, deps: ApplicationDependencies;
    beforeAll(async () => { db = await createTestDatabase(); await migrateDatabase(db.db); }, TEST_DATABASE_HOOK_TIMEOUT_MS);
    afterAll(async () => { await db?.close(); });
    beforeEach(async () => {
        await db.pool.query("truncate finance_journal_transactions,finance_currencies,finance_categories,finance_instruments cascade");
        await seedDatabase(db.db);
        deps = { unitOfWork: { run: (work, config) => db.db.transaction(work, config) }, clock: { now: () => new Date("2026-10-31T12:00:00Z") }, ids: { nextId: k => `${k}-${randomUUID()}` } };
    });
    it("keeps archived accounts and signed corrections in the historical result", async () => {
        const bank = await createAccount(deps, { name: "Istorijska banka", classification: "asset", currencyCode: "EUR", subtype: "bank" });
        const expense = await createCategory(deps, { name: "Istorijski trošak", classification: "expense" });
        await recordTransaction(deps, { type: "opening_balance", accountId: bank.id, amount: "1000", occurredAt: new Date("2026-09-01T12:00:00Z") });
        const original = await recordTransaction(deps, { type: "expense", accountId: bank.id, categoryId: expense.id, amount: "100", occurredAt: new Date("2026-10-03T12:00:00Z") });
        await correctTransaction(deps, { originalId: original.id, replacement: { type: "expense", accountId: bank.id, categoryId: expense.id, amount: "120" } });
        await archiveAccount(deps, { id: bank.id });
        const point = (await getMonthlyReports(deps, { month: "2026-10", months: 1 }, options)).points[0];
        expect(point).toMatchObject({ netWorthEur: "880", expenseEur: "120", netEur: "-120", marketEffectEur: "0", unattributedEur: "0" });
    });
    it("does not value past cash using a future rate", async () => {
        const bank = await createAccount(deps, { name: "USD banka", classification: "asset", currencyCode: "USD", subtype: "bank" });
        await recordTransaction(deps, { type: "opening_balance", accountId: bank.id, amount: "100", occurredAt: new Date("2026-09-01T12:00:00Z") });
        await db.pool.query("insert into finance_exchange_rates(id,base_currency_code,quote_currency_code,rate,provider,provider_timestamp,retrieved_at,status) values('future','USD','EUR',0.9,'test','2026-10-02','2026-10-02','valid')");
        const point = (await getMonthlyReports(deps, { month: "2026-09", months: 1 }, options)).points[0];
        expect(point.netWorthEur).toBeNull();
        expect(point.missingSources.length).toBeGreaterThan(0);
    });
    it("separates purchases from market gains and includes trading fees once", async () => {
        const cash = await createAccount(deps, { name: "Broker cash", classification: "asset", currencyCode: "EUR", subtype: "broker_cash" });
        await recordTransaction(deps, { type: "opening_balance", accountId: cash.id, amount: "1000", occurredAt: new Date("2026-09-01T12:00:00Z") });
        await db.pool.query("insert into finance_investment_accounts(id,name,cash_account_id) values('broker','Broker',$1)", [cash.id]);
        await db.pool.query("insert into finance_instruments(id,symbol,name,class,valuation_method,quote_currency_code) values('test','TEST','Test','stock','market_quote','EUR')");
        await buyInvestment(deps, { investmentAccountId: "broker", instrumentId: "test", quantity: "2", grossAmount: "200", feeAmount: "2", tradeCurrencyCode: "EUR", tradeFxRateToEur: "1", occurredAt: new Date("2026-10-03T12:00:00Z") });
        await db.pool.query("insert into finance_market_quotes(id,instrument_id,quote_currency_code,price,provider,provider_timestamp,retrieved_at,status) values('price','test','EUR',110,'test','2026-10-30','2026-10-30','valid')");
        const point = (await getMonthlyReports(deps, { month: "2026-10", months: 1 }, options)).points[0];
        expect(point).toMatchObject({ netWorthEur: "1018", incomeEur: "0", expenseEur: "2", investmentBuysEur: "200", marketEffectEur: "20", netWorthChangeEur: "18", unattributedEur: "0" });
    });
    it("retains a stored quote marked stale by a failed refresh", async () => {
        const cash = await createAccount(deps, { name: "Stale broker", classification: "asset", currencyCode: "EUR", subtype: "broker_cash" });
        await db.pool.query("insert into finance_investment_accounts(id,name,cash_account_id) values('stale-broker','Stale broker',$1)", [cash.id]);
        await db.pool.query("insert into finance_instruments(id,symbol,name,class,valuation_method,quote_currency_code) values('stale-test','STALE','Test','stock','market_quote','EUR')");
        await buyInvestment(deps, { investmentAccountId: "stale-broker", instrumentId: "stale-test", quantity: "1", grossAmount: "100", tradeCurrencyCode: "EUR", tradeFxRateToEur: "1", occurredAt: new Date("2026-10-03T12:00:00Z") });
        await db.pool.query("insert into finance_market_quotes(id,instrument_id,quote_currency_code,price,provider,provider_timestamp,retrieved_at,status) values('stale-price','stale-test','EUR',110,'test','2026-10-30','2026-10-30','stale')");
        const point = (await getMonthlyReports(deps, { month: "2026-10", months: 1 }, { ...options, marketDataStaleAfterMs: 3600000 })).points[0];
        expect(point.netWorthEur).toBe("10");
        expect(point.stale).toBe(true);
    });
    it("uses replacement FX for corrected foreign-currency trade cash postings", async () => {
        const cash = await createAccount(deps, { name: "USD broker", classification: "asset", currencyCode: "USD", subtype: "broker_cash" });
        await recordTransaction(deps, { type: "opening_balance", accountId: cash.id, amount: "1000", occurredAt: new Date("2026-09-01T12:00:00Z") });
        await db.pool.query("insert into finance_exchange_rates(id,base_currency_code,quote_currency_code,rate,provider,provider_timestamp,retrieved_at,status) values('usd','USD','EUR',0.8,'test','2026-09-01','2026-09-01','valid')");
        await db.pool.query("insert into finance_investment_accounts(id,name,cash_account_id) values('usd-broker','USD broker',$1)", [cash.id]);
        await db.pool.query("insert into finance_instruments(id,symbol,name,class,valuation_method,quote_currency_code) values('usd-test','USDTEST','Test','stock','market_quote','USD')");
        const buy = await buyInvestment(deps, { investmentAccountId: "usd-broker", instrumentId: "usd-test", quantity: "1", grossAmount: "100", tradeCurrencyCode: "USD", tradeFxRateToEur: "0.9", occurredAt: new Date("2026-10-03T12:00:00Z") });
        await correctInvestmentTransaction(deps, { originalId: buy.id, investmentAccountId: "usd-broker", instrumentId: "usd-test", quantity: "1", grossAmount: "100", feeAmount: "0", tradeCurrencyCode: "USD", tradeFxRateToEur: "0.95", occurredAt: new Date("2026-10-03T12:00:00Z") });
        await db.pool.query("insert into finance_market_quotes(id,instrument_id,quote_currency_code,price,provider,provider_timestamp,retrieved_at,status) values('usd-price','usd-test','USD',100,'test','2026-10-30','2026-10-30','valid')");
        const data = await deps.unitOfWork.run(tx => new HistoryRepository(tx).load(deps.clock.now()));
        data.trades.sort((a, b) => Number(!!a.correctionOfId) - Number(!!b.correctionOfId));
        const point = computeMonthlyReport(data, "2026-10", deps.clock.now(), options);
        expect(point).toMatchObject({ netWorthEur: "800", marketEffectEur: "0", fxEffectEur: "0", unattributedEur: "0" });
    });
    it("does not charge acquisition fees from an opening lot as current expenses", async () => {
        const cash = await createAccount(deps, { name: "Opening broker", classification: "asset", currencyCode: "EUR", subtype: "broker_cash" });
        await db.pool.query("insert into finance_investment_accounts(id,name,cash_account_id) values('opening-broker','Opening broker',$1)", [cash.id]);
        await recordOpeningLot(deps, { investmentAccountId: "opening-broker", instrumentId: "instrument-vwce", quantity: "2", acquiredAt: new Date("2026-10-03T12:00:00Z"), price: "100", currencyCode: "EUR", fees: "2", tradeFxRateToEur: "1" });
        await db.pool.query("insert into finance_market_quotes(id,instrument_id,quote_currency_code,price,provider,provider_timestamp,retrieved_at,status) values('opening-price','instrument-vwce','EUR',100,'test','2026-10-30','2026-10-30','valid')");
        expect((await getMonthlyReports(deps, { month: "2026-10", months: 1 }, options)).points[0]).toMatchObject({ netWorthEur: "200", expenseEur: "0", adjustmentsEur: "200", unattributedEur: "0" });
    });
    it("values native crypto cash from stored crypto prices", async () => {
        const wallet = await createAccount(deps, { name: "BTC wallet", classification: "asset", currencyCode: "BTC", subtype: "crypto_wallet" });
        await recordTransaction(deps, { type: "opening_balance", accountId: wallet.id, amount: "0.1", occurredAt: new Date("2026-09-01T12:00:00Z") });
        await db.pool.query("insert into finance_market_quotes(id,instrument_id,quote_currency_code,price,provider,provider_timestamp,retrieved_at,status) values('btc-price','instrument-btc','EUR',50000,'test','2026-09-01','2026-09-01','valid')");
        expect((await getMonthlyReports(deps, { month: "2026-09", months: 1 }, options)).points[0].netWorthEur).toBe("5000");
    });
});

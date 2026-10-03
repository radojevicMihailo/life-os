import Decimal from "decimal.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/modules/finance/application/accounts";
import { recordTransaction } from "@/modules/finance/application/transactions";
import { createGoal, getGoalProgress } from "@/modules/finance/application/goals";
import { setAccountPurpose } from "@/modules/finance/application/account-purposes";
import { setManualOverride } from "@/modules/finance/application/valuation";
import { listAccounts } from "@/modules/finance/read-models/accounts";
import { getMutationOptions } from "@/modules/finance/read-models/forms";
import { ValuationRepository } from "@/modules/finance/db/repositories/valuation";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { seedDatabase } from "@/modules/finance/db/seed";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";
const now = new Date("2026-10-03T12:00:00Z");
const options = { exchangeRateStaleAfterMs: 3600000, marketDataStaleAfterMs: 3600000 };
describe("native crypto accounts", () => {
 let testDb: TestDatabase; let deps: ApplicationDependencies; let sequence = 0;
 beforeAll(async () => {
  testDb = await createTestDatabase(); await migrateDatabase(testDb.db); await seedDatabase(testDb.db);
  deps = { unitOfWork: { run: (work, config) => testDb.db.transaction(work, config) }, clock: { now: () => now }, ids: { nextId: (kind) => `${kind}-crypto-${++sequence}` } };
 }, TEST_DATABASE_HOOK_TIMEOUT_MS);
 afterAll(async () => { await testDb?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);
 it.each([["BTC",8,"0.00000001"],["ETH",18,"0.000000000000000001"]] as const)("offers %s accounts and preserves the smallest native unit", async (currencyCode, minorUnit, amount) => {
  expect((await getMutationOptions(deps)).currencies.find((c) => c.code === currencyCode)).toMatchObject({ isActive: true, minorUnit: String(minorUnit) });
  const account = await createAccount(deps, { name: `${currencyCode} wallet`, classification: "asset", subtype: "crypto_wallet", currencyCode });
  expect(account.minorUnit).toBe(minorUnit);
  await recordTransaction(deps, { type: "opening_balance", accountId: account.id, amount });
  expect(new Decimal((await listAccounts(deps, options)).groups.asset.find((a) => a.id === account.id)!.nativeBalance).toFixed()).toBe(amount);
  await expect(recordTransaction(deps, { type: "opening_balance", accountId: account.id, amount: `0.${"0".repeat(minorUnit)}1` })).rejects.toMatchObject({ code: "money_precision_exceeded" });
 });
 it("values BTC goal reservations from crypto quotes, with manual FX taking precedence", async () => {
  const account = await createAccount(deps, { name: "BTC savings", classification: "asset", subtype: "crypto_wallet", currencyCode: "BTC" });
  await recordTransaction(deps, { type: "opening_balance", accountId: account.id, amount: "0.02" });
  const goal = await createGoal(deps, { name: "Emergency", targetCurrencyCode: "EUR", targetAmount: "1000" });
  await setAccountPurpose(deps, { accountId: account.id, targetId: goal.id, targetType: "goal", amount: "0.01" });
  expect((await getGoalProgress(deps, { id: goal.id }, options)).balance).toBeNull();
  await deps.unitOfWork.run((tx) => new ValuationRepository(tx).insertMarketQuote("crypto-quote", { instrumentId: "instrument-btc", providerId: "bitcoin", quoteCurrencyCode: "EUR", price: "100000", provider: "coingecko", providerTimestamp: now, retrievedAt: now }));
  expect(await getGoalProgress(deps, { id: goal.id }, options)).toMatchObject({ balance: "1000", percentage: "100", allocations: [{ valuation: { sourceToEur: { source: "coingecko", stale: false } } }] });
  expect(await deps.unitOfWork.run((tx) => new ValuationRepository(tx).listFxTargetCurrencies())).not.toContain("BTC");
  await setManualOverride(deps, { kind: "market_quote", instrumentId: "instrument-btc", quoteCurrencyCode: "EUR", value: "95000", effectiveAt: now });
  expect(await getGoalProgress(deps, { id: goal.id }, options)).toMatchObject({ balance: "950", allocations: [{ valuation: { sourceToEur: { source: "manual" } } }] });
  await setManualOverride(deps, { kind: "exchange_rate", baseCurrencyCode: "BTC", quoteCurrencyCode: "EUR", value: "90000", effectiveAt: now });
  expect(await getGoalProgress(deps, { id: goal.id }, options)).toMatchObject({ balance: "900", allocations: [{ valuation: { sourceToEur: { source: "manual" } } }] });
 });
});

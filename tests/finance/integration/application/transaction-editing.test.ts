import { setBudgetLimit } from "@/modules/finance/application/budgets";
import { parseCorrectionForm } from "@/modules/finance/ui/forms/transaction";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { createAccount } from "@/modules/finance/application/accounts";
import { createCategory } from "@/modules/finance/application/categories";
import { correctTransaction, deleteTransaction, getNativeBalances, recordTransaction } from "@/modules/finance/application/transactions";
import { listTransactions } from "@/modules/finance/read-models/transactions";
import { seedDatabase } from "@/modules/finance/db/seed";
import { migrateDatabase } from "@/test/migration/finance-migrate";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";

let testDb: TestDatabase;
let deps: ApplicationDependencies;
let sequence = 0;
beforeAll(async () => { testDb = await createTestDatabase(); await migrateDatabase(testDb.db); }, TEST_DATABASE_HOOK_TIMEOUT_MS);
beforeEach(async () => {
  await testDb.pool.query("truncate finance_journal_transactions, finance_categories, finance_currencies cascade");
  await seedDatabase(testDb.db);
  deps = { unitOfWork: { run: (work, config) => testDb.db.transaction(work, config) }, ids: { nextId: (kind) => `${kind}-edit-${++sequence}` }, clock: { now: () => new Date("2026-10-14T12:00:00Z") } };
});
afterAll(async () => { await testDb?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);
async function setup() {
  const a = await createAccount(deps, { name: "Cash A", classification: "asset", subtype: "cash", currencyCode: "EUR" });
  const b = await createAccount(deps, { name: "Cash B", classification: "asset", subtype: "cash", currencyCode: "EUR" });
  const c = await createCategory(deps, { name: "Food", classification: "expense" });
  await recordTransaction(deps, { type: "opening_balance", accountId: a.id, amount: "100" });
  await recordTransaction(deps, { type: "opening_balance", accountId: b.id, amount: "100" });
  const original = await recordTransaction(deps, { type: "expense", accountId: a.id, categoryId: c.id, amount: "20", occurredAt: new Date("2026-09-05T10:00:00Z"), description: "Lunch" });
  return { a, b, c, original };
}
it("edits account, category, amount and date repeatedly while displaying only the latest transaction", async () => {
  const { a, b, c, original } = await setup();
  const other = await createCategory(deps, { name: "Restaurant", classification: "expense" });
  const first = await correctTransaction(deps, { originalId: original.id, replacement: { type: "expense", accountId: b.id, categoryId: other.id, amount: "30", occurredAt: new Date("2026-10-07T10:00:00Z"), description: "Dinner" } });
  const second = await correctTransaction(deps, { originalId: first.replacement.id, replacement: { type: "expense", accountId: b.id, categoryId: c.id, amount: "25", occurredAt: new Date("2026-10-08T10:00:00Z"), description: "Correct dinner" } });
  expect(await getNativeBalances(deps, { accountIds: [a.id, b.id] })).toEqual(expect.arrayContaining([
    expect.objectContaining({ accountId: a.id, displayBalance: "100.00" }), expect.objectContaining({ accountId: b.id, displayBalance: "75.00" }),
  ]));
  const items = (await listTransactions(deps, { type: "expense" })).items;
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ id: second.replacement.id, description: "Correct dinner", occurredAt: new Date("2026-10-08T10:00:00Z"), correctionDraft: { accountId: b.id, categoryId: c.id, amount: "25" } });
  const reversals = await testDb.pool.query("select occurred_at from finance_journal_transactions where type='correction' order by occurred_at");
  expect(reversals.rows.map((row) => row.occurred_at.toISOString())).toEqual(["2026-09-05T10:00:00.000Z", "2026-10-07T10:00:00.000Z"]);
});
it("deletes an expense, restores balance and removes it from current lists exactly once", async () => {
  const { a, original } = await setup();
  await deleteTransaction(deps, { id: original.id });
  expect(await getNativeBalances(deps, { accountIds: [a.id] })).toEqual([expect.objectContaining({ displayBalance: "100.00" })]);
  expect((await listTransactions(deps, { type: "expense" })).items).toEqual([]);
  expect((await listTransactions(deps)).items.some((item) => item.id === original.id || item.type === "correction")).toBe(false);
  await expect(deleteTransaction(deps, { id: original.id })).rejects.toMatchObject({ code: "journal_already_corrected" });
  const reversals = await testDb.pool.query("select count(*) from finance_journal_transactions where type='correction'");
  expect(reversals.rows[0].count).toBe("1");
});
it("serializes competing edit and delete requests to prevent double reversal", async () => {
  const { a, c, original } = await setup();
  const results = await Promise.allSettled([
    deleteTransaction(deps, { id: original.id }),
    correctTransaction(deps, { originalId: original.id, replacement: { type: "expense", accountId: a.id, categoryId: c.id, amount: "10" } }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const reversals = await testDb.pool.query("select count(*) from finance_journal_transactions where type='correction'");
  expect(reversals.rows[0].count).toBe("1");
});

it("moves budget spending to the edited date and removes it on deletion", async () => {
  const { a, c, original } = await setup();
  for (const month of ["2026-09", "2026-10"]) await setBudgetLimit(deps, { categoryId: c.id, currencyCode: "EUR", month, amount: "100" });
  const edit = await correctTransaction(deps, { originalId: original.id, replacement: { type: "expense", accountId: a.id, categoryId: c.id, amount: "30", occurredAt: new Date("2026-10-07T10:00:00Z") } });
  let periods = await testDb.pool.query("select month::text,spending_amount::float8 as spending from finance_budget_periods where category_id=$1 order by month", [c.id]);
  expect(periods.rows).toEqual([{ month: "2026-09-01", spending: 0 }, { month: "2026-10-01", spending: 30 }]);
  await deleteTransaction(deps, { id: edit.replacement.id });
  periods = await testDb.pool.query("select month::text,spending_amount::float8 as spending from finance_budget_periods where category_id=$1 order by month", [c.id]);
  expect(periods.rows).toEqual([{ month: "2026-09-01", spending: 0 }, { month: "2026-10-01", spending: 0 }]);
});
it("preserves the separate fee when editing a transfer amount", async () => {
  const { a, b, c } = await setup();
  const transfer = await recordTransaction(deps, { type: "transfer", fromAccountId: a.id, toAccountId: b.id, amount: "10", fee: { amount: "2", categoryId: c.id } });
  const draft = (await listTransactions(deps, { type: "transfer" })).items.find((item) => item.id === transfer.id)?.correctionDraft;
  expect(draft).toMatchObject({ operation: "transfer", amount: "10", feeAmount: "2", feeCategoryId: c.id });
  await correctTransaction(deps, parseCorrectionForm({ ...draft, originalId: transfer.id, correctedAmount: "15" }));
  expect(await getNativeBalances(deps, { accountIds: [a.id, b.id] })).toEqual(expect.arrayContaining([
    expect.objectContaining({ accountId: a.id, displayBalance: "63.00" }), expect.objectContaining({ accountId: b.id, displayBalance: "115.00" }),
  ]));
});

it("preserves the original time when a date-only edit keeps the same local day", async () => {
  const { a, c, original } = await setup();
  const input = parseCorrectionForm({ originalId: original.id, operation: "expense", accountId: a.id, categoryId: c.id, amount: "20", occurredAt: "2026-09-05", replacementDescription: "New description" });
  const edit = await correctTransaction(deps, input);
  const row = (await listTransactions(deps, { type: "expense" })).items.find((item) => item.id === edit.replacement.id);
  expect(row?.occurredAt.toISOString()).toBe("2026-09-05T10:00:00.000Z");
});

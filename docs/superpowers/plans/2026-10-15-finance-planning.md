# Finance Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execution method selected by user: native inline with one final independent review. Do not create commits.

**Goal:** Implement the approved planning, available-cash, budget, goal, monthly-report and interface improvements without CSV import.

**Architecture:** Extend the existing finance domain/application/DB/read-model/UI layers. Planned occurrences remain separate from posted journals; confirmation reuses journal persistence within the same DB transaction. Derive forecasts and historical reports using decimal arithmetic and existing stored valuations.

**Tech Stack:** Next.js 16.3.2, React 19, TypeScript, Drizzle/PostgreSQL 16, Zod, decimal.js, Vitest, Playwright, existing Recharts.

**Spec:** `docs/superpowers/specs/2026-10-15-finance-planning-design.md` (approved by user).

## Global Constraints

- Implement approved points 1, 2, 4, 5 and 6 and the interface improvements; exclude CSV import and bank reconciliation.
- No new services, paid packages, additional provider requests, Fly configuration changes or automatically sent messages.
- Use Europe/Belgrade calendar dates and exact decimal amounts.
- Add migrations in `db/unified-migrations`; never edit applied migrations.
- Preserve existing balances, reservations, corrections, privacy controls and authentication.
- Preserve the user's existing `AGENTS.md` modification.
- Do not commit, deploy, apply migrations to production or change infrastructure as part of implementation.
- Before writing Next.js code, read relevant installed guides in `node_modules/next/dist/docs/01-app/01-getting-started/` for server/client components, mutation, caching and route handling. Read the worktree and execution skills at execution time; do not reset existing changes.

## Review Focus

1. A double-click or retried payment confirmation creates one journal, including when requests race (Task 3).
2. Editing/deleting a confirmed journal must not silently leave a phantom payment or duplicate deduction (Task 3).
3. A reservation and planned expense in the same category/account/month count only once, even with several occurrences (Task 4).
4. Archived accounts and corrected trades remain reflected in historical reports, without future rates leaking into past months (Task 7).
5. A saved URL with invalid dates, cursor, query text or archived filter options stays usable and does not issue an invalid SQL cast (Task 1).

## File Map and Ownership

- `domain/calendar.ts`: validated date-only arithmetic and month boundaries.
- `domain/planning.ts`: recurrence expansion and occurrence status merging.
- `db/schema/planning.ts`, `db/repositories/planning.ts`: rules, occurrence exceptions and persisted cash-account preferences.
- `application/planning.ts`: plan mutations and atomic confirmation/link/skip.
- `read-models/planning.ts`: bounded upcoming/overdue view and horizon selection.
- `ui/forms/planning.ts`, `ui/actions/planning.ts`, `app/finance/planning/`: authorized forms and planning page.
- `domain/available-cash.ts`, `read-models/available-cash.ts`: reservation-aware liquid funds.
- `domain/budget-projection.ts`: budget pace/projection/status.
- `domain/goal-plan.ts`: dates, funded amount and required monthly saving.
- `domain/reporting.ts`, `db/repositories/history.ts`, `read-models/reports.ts`: historical cash flows, balances, quantities and valuation effects.
- `ui/components/transaction-labels.ts`, `ui/forms/transaction-filters.ts`: shared Serbian copy and URL validation.
- `app/finance/reports/`: monthly report page and privacy-aware chart/table.
- Existing dashboard, budgets, goals, settings, actions and navigation consume these units; do not consolidate unrelated code.

## Task 1: Searchable, localized transactions with pagination

**Files:** Create `modules/finance/ui/components/transaction-labels.ts`, `modules/finance/ui/forms/transaction-filters.ts`; modify `modules/finance/read-models/transactions.ts`, `app/finance/transactions/page.tsx`, `app/finance/page.tsx`; extend `tests/finance/unit/read-models/transactions.test.ts`, create `tests/finance/unit/ui/forms/transaction-filters.test.ts`, extend `tests/finance/integration/read-models/transactions.test.ts`.

**Interfaces:** `parseTransactionFilters(params: Record<string,string|string[]|undefined>): TransactionFilters`; add `q?: string`, `cursor?: { occurredAt: string; id: string }` to `TransactionFilters`; add `nextCursor: string|null` to `TransactionsReadModel`. Export total `Record<JournalType,string>` and `Record<JournalSource,string>` label maps. Encode cursor as validated URL-safe text; invalid input resets cursor, not the entire page.

- [ ] Add regression tests before implementation. Include these parser assertions:

```ts
expect(parseTransactionFilters({ dateFrom: "2026-02-30" }).dateFrom).toBeUndefined();
expect(parseTransactionFilters({ q: "  kafa  " }).q).toBe("kafa");
expect(parseTransactionFilters({ cursor: "broken" }).cursor).toBeUndefined();
```

- [ ] Run `pnpm exec vitest run tests/finance/unit/ui/forms/transaction-filters.test.ts` and confirm failure for missing behavior.
- [ ] Validate dates against Gregorian calendar, trim query to 200 characters, validate type and bounded cursor fields. Implement literal, case-insensitive substring matching with parameterized SQL: `position(lower(${q}) in lower(coalesce(description, ''))) > 0`. This treats `%` and `_` literally.
- [ ] Add tuple keyset condition `(occurred_at,id) < (cursor_date,cursor_id)` to existing descending order; fetch limit+1. Keep filters in page links, and make previous links reconstruct the prior cursor stack from URL state. Never use an offset with a cursor.
- [ ] Replace ID fields with named account/category selects including archived options. Render all finance journal types and sources via shared labels. Add description search, clear and previous/next links. Protect dashboard descriptions that fall back to transaction type.
- [ ] Extend integration tests using existing `createAccount`, `createCategory`, `recordTransaction` setup: 51 same-time records produce 50 then 1, no duplicates; literal `%` only matches a description containing `%`; combinations preserve account/category filters; archived options still find historical rows.
- [ ] Run the parser/read-model unit tests and `pnpm exec vitest run tests/finance/integration/read-models/transactions.test.ts --maxWorkers=1`; verify Serbian names and filter navigation visually.

## Task 2: Recurrence calendar and planning storage

**Files:** Create `modules/finance/domain/calendar.ts`, `modules/finance/domain/planning.ts`, `modules/finance/db/schema/planning.ts`, `modules/finance/db/repositories/planning.ts`, `db/unified-migrations/0017_finance_planning.sql`; export schema in `modules/finance/db/schema/index.ts`; extend IDs/errors in `application/ports.ts`; create `tests/finance/unit/domain/planning.test.ts`; extend integration migration tests.

**Interfaces:** `type Frequency = 'once'|'weekly'|'monthly'|'yearly'`; `PlanRule = { id:string; name:string; type:'income'|'expense'; accountId:string; categoryId:string; amount:string; startDate:string; endDate:string|null; frequency:Frequency; isPrimaryIncome:boolean; archivedAt:Date|null }`; `expandOccurrences(rule:PlanRule, from:string, to:string): {ruleId:string;dueDate:string}[]`. Date functions accept validated ISO date strings, never host-local midnight parsing.

- [ ] Add an anchored-calendar test:

```ts
const rule: PlanRule = { id:"r", name:"Račun", type:"expense", accountId:"a",
  categoryId:"c", amount:"100", startDate:"2026-01-31", endDate:null,
  frequency:"monthly", isPrimaryIncome:false, archivedAt:null };
expect(expandOccurrences(rule,"2026-02-01","2026-03-31").map(x=>x.dueDate))
  .toEqual(["2026-02-28","2026-03-31"]);
```

- [ ] Run the recurrence unit test and verify failure, then implement anchored expansion with direct jumps to the requested range. Bound supported years to 1900–2100 and requests to at most 12 months. Add yearly leap-day, once-only, weekly DST, inclusive end-date and archived-rule cases.
- [ ] Migration creates `finance_plan_rules`, `finance_plan_occurrences`, `finance_cash_account_preferences`. Rules have account/category FKs, positive decimal amount, constrained type/frequency, date bounds and timestamps. Occurrences have unique `(rule_id,due_date)`, unique nullable `journal_transaction_id`, constrained confirmed/skipped status and JSON confirmation snapshot. Preferences use account ID primary key and `included` boolean. Do not touch access-token settings.
- [ ] Repository methods accept an existing `DbTx`: `lockRule(id)`, `listRules()`, `getOccurrence(ruleId,dueDate)`, `saveRule(rule)`, `saveOccurrence(record)`. Read methods return typed fields, not unvalidated JSON. Add FK indexes and lookup indexes for active rules.
- [ ] Add migration tests for applying all migrations twice, uniqueness, invalid amounts, wrong date ranges, and legacy rows remaining unchanged. Update migration test harness if it enumerates fixed filenames.
- [ ] Run `pnpm exec vitest run tests/finance/unit/domain/planning.test.ts tests/finance/integration/db/migrations.test.ts --maxWorkers=1`.

## Task 3: Atomic payment confirmation and planning UI

**Files:** Create `modules/finance/application/planning.ts`, `modules/finance/read-models/planning.ts`, `modules/finance/ui/forms/planning.ts`, `modules/finance/ui/actions/planning.ts`, `app/finance/planning/page.tsx`, `app/finance/planning/planning-forms.tsx`; modify `application/transactions.ts`, `ui/api-errors.ts`, `ui/components/app-nav.tsx`; create `tests/finance/integration/application/planning.test.ts`, `tests/finance/unit/ui/forms/planning.test.ts`.

**Interfaces:** `savePlan(deps,input:Omit<PlanRule,'id'|'archivedAt'>&{id?:string}):Promise<PlanRule>`; `confirmOccurrence(deps,{ruleId,dueDate,amount,occurredAt}):Promise<{id:string}>`; `linkOccurrence(deps,{ruleId,dueDate,transactionId}):Promise<{id:string}>`; `skipOccurrence(deps,{ruleId,dueDate}):Promise<void>`; `archivePlan(deps,{id}):Promise<void>`; `listPlanning(deps,{from,to}):Promise<{rules:PlanRule[];occurrences:PlannedOccurrence[]}>`. Define `PlannedOccurrence` with rule snapshot, dueDate, amount, status `pending|confirmed|skipped`, journal ID, overdue flag and currency.

- [ ] Build fixture using the existing disposable database/seed helper, EUR bank account, expense category, opening balance 1,000 and monthly 100 expense rule. Pin `deps.clock` to 2026-10-15. Add this race assertion:

```ts
const input = {ruleId:rule.id,dueDate:"2026-10-15",amount:"100",
  occurredAt:new Date("2026-10-15T10:00:00Z")};
const results = await Promise.all([confirmOccurrence(deps,input),confirmOccurrence(deps,input)]);
expect(results[0].id).toBe(results[1].id);
expect((await getNativeBalances(deps,{accountIds:[bank.id]}))[0].displayBalance).toBe("900.00");
```

- [ ] Run new integration test and confirm failure. Extract current `recordTransaction` body into exported `recordTransactionInTransaction(deps,tx,input)` preserving budget locks and recomputation. Existing public function delegates through its existing unit of work. Confirmation and linking lock the rule, verify real occurrence membership, then write journal/exception atomically. Establish one lock order for confirmation, linking and journal corrections: relevant rule IDs sorted first, then existing journal/budget locks. Add a helper to discover/lock linked rules before journal mutations.
- [ ] Return the existing confirmed journal ID on retry; reject inconsistent retry data with a clear error. Linking validates posted/non-reversed type, account, category, currency and single linkage. Snapshot actual confirmed amount/date and rule fields. Skip cannot silently replace confirmation. Editing a rule never overwrites confirmation snapshots.
- [ ] Wire corrections to move the occurrence journal ID to replacement within the same transaction; deletion removes the confirmation exception so the occurrence becomes pending. Prevent deleting referenced accounts/categories through existing in-use checks; archive remains allowed, confirmation against inactive references fails visibly.
- [ ] Test failed validation leaves both tables untouched, parallel linking conflicts, repeated skip, invalid due date, inactive account, correction and deletion after confirmation, linked archived rule and an old confirmed occurrence after rule edits.
- [ ] Implement Zod forms with Serbian errors, standard `executeAction({financial:true})` guards, and invalidation of planning/dashboard/accounts/budgets/reports. UI shows overdue/pending/confirmed/skipped, editable confirmation amount/date, named existing-journal selection, skip/archive and editable rule form. Use bounded month navigation and preserve snapshots of confirmed rows.
- [ ] Run `pnpm exec vitest run tests/finance/integration/application/planning.test.ts tests/finance/integration/application/transactions.test.ts tests/finance/integration/application/transaction-editing.test.ts tests/finance/unit/ui/forms/planning.test.ts --maxWorkers=1`.

## Task 4: Available cash and persisted account selection

**Files:** Create `domain/available-cash.ts`, `read-models/available-cash.ts`, `application/cash-preferences.ts`, `ui/forms/cash-preferences.ts`, `ui/actions/cash-preferences.ts` under `modules/finance`; modify dashboard read model/page and finance settings forms/page; create `tests/finance/unit/domain/available-cash.test.ts` and `tests/finance/integration/read-models/available-cash.test.ts`.

**Interfaces:** `CashAccountInput={id:string;balance:string;goalReserved:string;otherReserved:string;groups:{categoryId:string;month:string;reserved:string;pending:string}[];uncoveredPending:string}`; `calculateAvailableCash(accounts:CashAccountInput[],days:number):{available:string;daily:string;deficit:string}`. `getAvailableCash(deps,{endDate?:string},valuationOptions)` returns native breakdown, nullable EUR total, horizon/reason, days, daily/deficit, valuation sources and completeness. Preferences service `setCashAccountPreferences(deps,{accounts:{id:string;included:boolean}[]}):Promise<void>` verifies each ID is a non-system asset.

- [ ] Pin overlap accounting with the following unit test before implementation:

```ts
expect(calculateAvailableCash([{id:"a",balance:"1000",goalReserved:"200",
  otherReserved:"0",uncoveredPending:"0",groups:[{categoryId:"c",month:"2026-10",
  reserved:"300",pending:"100"}]}],10))
  .toEqual({available:"500",daily:"50",deficit:"0"});
```

- [ ] Run unit test for failure; implement per-group `max(reserved,pending)`, then subtract goals/other reservations/uncovered pending. Sum signed balances before computing deficit; daily uses `max(total,0)/max(days,1)` rounded down to currency precision. Aggregate all occurrences before applying overlap credit, never once per occurrence.
- [ ] Query all needed accounts, actual balances, purposes and occurrences in one repeatable-read transaction. Include unpaid overdue occurrences from rule start without unbounded iteration: jump over covered spans and generate only within supported date range, enforce explicit UI bounds for old overdue lists while still including their amounts. Exclude future-dated posted movements from today's balance. Default included accounts are active cash assets excluding investment cash and crypto; explicit preference overrides defaults for eligible asset accounts.
- [ ] Select earliest pending primary income, otherwise earliest pending income, with stable rule-ID tie-breaking; omit received/skipped income. Auto horizon excludes income date, custom end includes it, fallback includes month end. Never include forecast income in actual balance. Group obligations/reservations by native account/category/month before conversion.
- [ ] Test several 100 expenses sharing a 150 reservation, reservation from another month/account, negative bank balance, no salary, income today, horizon before today, missing/stale FX, receivable exclusion, preference persistence and archived accounts. Verify settings never allow system/income/expense accounts.
- [ ] Render breakdown and daily figure with privacy components, source metadata and horizon label. Add settings account switches with visible saved state and action errors.
- [ ] Run `pnpm exec vitest run tests/finance/unit/domain/available-cash.test.ts tests/finance/integration/read-models/available-cash.test.ts --maxWorkers=1`.

## Task 5: Budget pace, forecasts and comparisons

**Files:** Create `modules/finance/domain/budget-projection.ts`; extend budget/dashboard read models and budgets/dashboard pages; create `tests/finance/unit/domain/budget-projection.test.ts`, `tests/finance/integration/read-models/budget-projection.test.ts`.

**Interfaces:** `projectBudget({available,spent,pending,elapsedDays,totalDays,period:'past'|'current'|'future'}):{projected:string|null;usedPercent:string|null;elapsedPercent:string;alerts:('overspent'|'near_limit'|'forecast_over'|'ahead_of_pace'|'no_capacity')[]}`. Extend budget items with `projection`, `previousMonths:{month:string;spent:string|null;currencyCode:string}[]` and complete/stale FX flags; keep all existing fields.

- [ ] Add and run failing assertion:

```ts
expect(projectBudget({available:"500",spent:"100",pending:"50",elapsedDays:10,
  totalDays:30,period:"current"}).projected).toBe("300");
```

- [ ] Implement `max(spent * totalDays/elapsedDays, spent + pending)` for current month, spent for past and no projection for future. Calculate elapsed days with Belgrade calendar. Alerts use >=80% actual, >100% actual/projected, and >=10 percentage points ahead of pace. Do not cap displayed utilization at 100% even if progress-bar width is capped.
- [ ] Query last three budget periods in bulk; missing periods or currency mismatches appear as unavailable. Derive pending expenses from Task 3, exclude confirmed/skipped entries and convert only with available labelled rates. No fabricated zero for missing FX or period history.
- [ ] Test first/last month day, leap February, negative carry leaving no capacity, zero spending, unknown FX, fixed bill already paid, and future month. UI shows warnings in words as well as color.
- [ ] Run both projection test files and existing budget domain/application tests with `--maxWorkers=1`.

## Task 6: Goal deadlines and monthly saving

**Files:** Add `db/unified-migrations/0018_finance_goal_deadlines.sql`; modify `db/schema/goals.ts`, `db/repositories/goals.ts`, `application/goals.ts`, `application/goal-funds.ts`, `read-models/forms.ts`, `ui/forms/goal.ts`, `app/finance/goals/goal-forms.tsx`, `app/finance/goals/page.tsx`; create `domain/goal-plan.ts` and `tests/finance/unit/domain/goal-plan.test.ts`; extend existing goal form/application integration tests.

**Interfaces:** nullable `targetDate:string|null` across goal record/input/forms/export JSON. `calculateGoalPlan({targetAmount,fundedCash,receivables,targetDate,today,minorUnit}):{remaining:string;monthly:string|null;months:number|null;status:'no_deadline'|'active'|'overdue'|'funded';conditionalReceivables:string}`. Nullable fundedCash makes dependent fields nullable and sets an explicit incomplete valuation flag in the read model.

- [ ] Add and run failing unit assertion:

```ts
expect(calculateGoalPlan({targetAmount:"1000",fundedCash:"200",receivables:"300",
  targetDate:"2026-12-31",today:"2026-10-15",minorUnit:2}))
  .toMatchObject({remaining:"800",monthly:"266.67",months:3,status:"active"});
```

- [ ] Add nullable date column without changing existing rows. Validate actual calendar dates; allow past dates so users can represent overdue goals. Blank form clears a deadline; all create/update/read/export paths preserve it.
- [ ] Split valued goal allocations into cash and receivable contributions; keep existing total/progress fields compatible. Monthly plan uses cash only and ceil rounding to minor unit. Underfunded reservations show uncertainty rather than asserting full coverage; include accounts' uncovered-reservation warnings beside plan values.
- [ ] Test no deadline, cleared deadline, past deadline, today deadline, already funded, missing FX, negative/zero target rejected by existing money validation and currencies with zero minor units. Add integration assertion that updating an old goal preserves its allocations.
- [ ] Render cash/receivable distinction and required monthly amount, with incomplete/stale and underfunded labels; preserve existing allocation forms and privacy behavior.
- [ ] Run goal unit/form tests and `tests/finance/integration/application/goals.test.ts`, `tests/finance/integration/application/exports.test.ts`.

## Task 7: Historical monthly report and attribution

**Files:** Create `modules/finance/domain/reporting.ts`, `modules/finance/db/repositories/history.ts`, `modules/finance/read-models/reports.ts`, `app/finance/reports/page.tsx`, `app/finance/reports/monthly-chart.tsx`; extend navigation; create `tests/finance/unit/domain/reporting.test.ts` and `tests/finance/integration/read-models/reports.test.ts`.

**Interfaces:** `HistoricalPoint={month:string;cutoff:Date;netWorthEur:string|null;incomeEur:string|null;expenseEur:string|null;netEur:string|null;savingsRate:string|null;investmentBuysEur:string|null;investmentSalesEur:string|null;marketEffectEur:string|null;fxEffectEur:string|null;adjustmentsEur:string|null;missingSources:string[];stale:boolean}`. `getMonthlyReports(deps,{month:string,months:number},valuationOptions):Promise<{points:HistoricalPoint[]}>`; clamp months 1–12. `calculateSavingsRate(income:string|null,expense:string|null):string|null`. History repository accepts `DbTx`, cutoffs and date bounds, returning bulk postings/trades/valuations, with no provider calls.

- [ ] Pin arithmetic before implementation:

```ts
expect(calculateSavingsRate("1000","750")).toBe("25");
expect(calculateSavingsRate("0","100")).toBeNull();
expect(calculateSavingsRate(null,"100")).toBeNull();
```

- [ ] Run failing unit tests. Implement month cutoffs as exclusive next-month local midnight (current month uses now). Group flows by effective Belgrade transaction dates, classify through ledger postings; income positive, expense positive, credits/refunds reduce expenses. Include corrected original + reversal + replacement by signed economic effect, while excluding standalone non-posted drafts/reversed trades according to current persistence semantics. Verify current correction code before choosing status predicate.
- [ ] Reconstruct holdings from buy/sell quantities and corrected investment records, and cash balances from all signed journal postings. Never count investment-linked cash twice. Include archived accounts/instruments with historical balances. Opening balances and correction adjustments stay separate from income/expense.
- [ ] Select valid automatic FX/quotes and applicable historical manual overrides whose effective time is <= cutoff; no later rate or quote. Honor historical cleared-at cutoff for manual overrides. For transaction flow conversion use valuation at transaction date; prefer persisted trade FX for investment flows. Missing valuation makes dependent aggregate null and lists source; staleness propagates.
- [ ] Compute attribution per instrument in native currency before FX: end value minus beginning value minus net purchased principal, with fees/dividends classified separately. Convert market change and principal flows with their appropriate stored rates; compute FX effect from differences in converted components. Perform the equivalent account-currency bridge for cash/receivables/liabilities. Aggregate explicit opening-state adjustments. If attribution inputs are unavailable return null, never label unexplained residual as market gain.
- [ ] Integration fixture pins: 1,000 cash opening; 200 investment purchase leaves 800 cash and 200 portfolio, net worth still 1,000; quote rise to 220 gives 20 market gain, not 220 income. Add sale, dividend/fee, corrected trade and backdated expense. Verify bridge sums to observed delta where complete.
- [ ] Test future-only rate produces null for prior month; absent initial-period value leaves attribution null; archived account remains in old totals; repeated same-day prices select deterministically; RSD cash FX movement is separate from security price movement. Use a query-count assertion to reject a query per transaction.
- [ ] Render chosen-month metrics, 12-month net worth/flows and table with source gaps. Chart must break on null (no `connectNulls`), show no financial values/tooltips while privacy is hidden, and have accessible table fallback. Validate month URL using Task 1 calendar helpers.
- [ ] Run reporting unit/integration files and existing investment correction/overview integration tests.

## Task 8: Cross-feature acceptance and delivery

**Files:** Extend `tests/e2e/finance-smoke.spec.ts`; create `tests/e2e/finance-planning.spec.ts`; update `README.md` with routes/behavior, and this plan's checkboxes with evidence. Review all finance server-action invalidation arrays for the new planning/reports views.

- [ ] Add browser journey: create monthly expense, confirm once, verify actual balance and planning status, correct it, verify new amount, skip next occurrence; set goal deadline; search localized transactions; open reports. Assert hidden privacy state hides chart/tooltips and available-cash breakdown. Use dedicated test DB, not the user's data.
- [ ] Run the new journey on desktop and narrow mobile viewport. Inspect forms, horizontal navigation, warning text, loading/error states and table overflow. Fix only issues in the approved scope.
- [ ] Run `pnpm typecheck`, `pnpm lint`, `pnpm test:finance`, `pnpm test:integration` and `pnpm build` once all feature checks pass. If Docker/test DB is unavailable, report the exact unrun integration checks; never claim they passed or point them at production.
- [ ] Run `git diff --check`, inspect full diff and financial invariants, verify applied migrations were not edited, and confirm `AGENTS.md` user changes are intact. Independent review method follows the user's execution selection, without committing.
- [ ] Deliver changed features, verification results and material limitations, including unavailable historical prices; link the design/plan and explain that production migration/deployment has not been performed.

## Plan Self-Review

- Spec sections map to Tasks 1–8: interface (1), plans (2–3), available cash (4), budgets (5), goals (6), history (7), cross-feature checks (8).
- All public names used between tasks are defined in their owning interfaces; existing helpers are referenced by their current names.
- All five review-focus conditions have explicit tests in their owning task.
- No implementation, migration execution, commit or infrastructure change is authorized by writing this plan alone.
- Review status: user approved execution; independent review completed and all five findings corrected with regression tests.

## Execution Results

- Tasks 1–7 implemented; Task 8 acceptance journey and visual checks completed.
- Cross-feature regressions cover archived overdue bills, correction snapshots, literal search/pagination, native crypto valuation, stale prices, opening-lot fees and replacement trade FX.
- Browser acceptance passed on mobile and desktop against a disposable local database.
- Existing `AGENTS.md` user changes are intact. No commit, production migration, deployment or infrastructure change was made.
- Verified: `pnpm test` (535 tests), `pnpm test:integration` (179 tests), Playwright `finance-planning.spec.ts` (2 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`.

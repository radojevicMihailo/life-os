# Finance Overview Page — Design

**Date:** 2026-06-11
**Route:** `/finance/overview`
**Status:** approved

## Goal

Single-page dashboard summarizing personal finance: spend by category, income by category, net cashflow over time, investment performance, month-over-month comparisons. Read-only.

## Scope

In:
- Aggregated views over a user-selected time window
- EUR-denominated reporting (uses stamped `eurAmount` per transaction)
- Live portfolio valuation for investment summary
- Drill-down from category → subcategory in breakdown tables

Out:
- USD or multi-currency toggle (EUR only this iteration)
- Editing transactions from overview
- Forecasts / budgeting
- Account-balance snapshot, top-N transactions, allocation pie

## Sections (top → bottom)

1. **Period picker** — URL-driven (`?from=YYYY-MM-DD&to=YYYY-MM-DD`); presets: This month (default), Last month, YTD, Custom. Currency label `EUR` static.
2. **MoM KPI row** — three cards: Income, Expense, Net. Each shows current-window total + delta % vs prior equal-length window (green if favorable, red if unfavorable; net delta colored by sign).
3. **Net cashflow chart** — auto granularity: daily (window ≤ 31 d), weekly (≤ 90 d), monthly (else). Stacked or grouped bars showing income vs expense per bucket, line overlay for net.
4. **Category breakdown — two columns**: spend-by-category (left) and income-by-category (right). Collapsible rows: clicking a category row expands to subcategory totals. Sorted descending by amount.
5. **Six-month bar chart** — fixed last 6 months ignoring picker; grouped bars income vs expense per month.
6. **Investment summary card** — client-loaded with skeleton. Shows: total EUR put into investments during window (sum of investment-kind outflows), current portfolio value (live spot), unrealized P/L in EUR and %.

## Transfer exclusion

A "transfer" transaction has a `transactionType` whose `categoryKind IS NULL`. These are excluded from all aggregates (totals, breakdowns, cashflow, MoM, 6mo). Only txs whose joined `transactionType.categoryKind IN ('income','expense','investment')` are counted.

## Data layer

New file: `app/finance/_actions/overview.ts`. Server actions:

### `getOverviewAggregates(from: string, to: string)`

One SQL roundtrip. Joins `transaction → transactionCategory → transactionSubcategory → transactionType`. Filters by `occurredOn BETWEEN from AND to` and `transactionType.categoryKind IS NOT NULL`. Excludes rows where `eurAmount IS NULL` (counts them separately for the warning).

Returns:

```ts
{
  totals: { income: number; expense: number; net: number };
  byCategory: Array<{
    kind: 'income' | 'expense';
    categoryId: string;
    categoryName: string;
    total: number;
    subRows: Array<{ subcategoryId: string | null; subcategoryName: string; total: number }>;
  }>;
  cashflowBuckets: Array<{ bucket: string; income: number; expense: number }>;
  granularity: 'day' | 'week' | 'month';
  excludedNullEur: number;
}
```

Granularity is computed from `to - from`. Bucket key derived via `date_trunc(granularity, occurred_on)` in SQL.

### `getMomComparison(from: string, to: string)`

Returns totals for `[from, to]` and for the prior equal-length window `[from - len, from - 1d]`:

```ts
{
  current: { income, expense, net };
  prior:   { income, expense, net };
}
```

### `getSixMonthBars()`

Returns last six full months (including current) of income/expense totals:

```ts
Array<{ month: string /* YYYY-MM */; income: number; expense: number }>;
```

### `getInvestmentSummary(from: string, to: string)`

Client-fetched (via separate server action call from the card). Returns:

```ts
{
  investedInWindow: number;   // sum eurAmount where category.kind='investment' and outflow
  currentValue: number;       // live spot valuation across investment accounts
  pnlAbsolute: number;
  pnlPercent: number;
}
```

Reuses portfolio live-pricing logic. Before implementation, check whether `app/finance/portfolio/page.tsx` already calls into `lib/finance/*` for valuation — if not, extract into `lib/finance/portfolioValuation.ts` first.

## Components (new, under `app/finance/_components/`)

- `OverviewPeriodPicker.tsx` (client) — preset buttons + custom range; writes to URL search params via `useRouter`.
- `KpiCard.tsx` — label, value (EUR-formatted), optional delta % with up/down icon and color.
- `CashflowChart.tsx` (client, recharts) — accepts `cashflowBuckets` + `granularity`; grouped bars income/expense + net line.
- `CategoryBreakdownTable.tsx` — props: `kind`, `rows`. Collapsible row state local. Sub-rows rendered beneath when expanded.
- `SixMonthChart.tsx` (client, recharts) — grouped bars per month.
- `InvestmentSummaryCard.tsx` (client) — own `useEffect` fetch, skeleton state, error state with retry button.

## Page composition

`app/finance/overview/page.tsx` (server component):

1. Parse `from`, `to` from search params; default to current calendar month.
2. `Promise.all([getOverviewAggregates, getMomComparison, getSixMonthBars])`.
3. Render: picker, KPI row, cashflow chart, breakdown columns, 6-month chart, then mount `<InvestmentSummaryCard from={from} to={to} />` (client component — fetches independently so live-pricing latency doesn't block the rest).

## Navigation

Add "Overview" entry to the finance sidebar group, placed above existing finance subroutes (Transactions, Portfolio, Configuration).

## Edge cases / errors

- Empty window → KPIs render `0,00 €`, sections show `Nema podataka` placeholder (Serbian to match existing UI strings).
- Txs with `eurAmount IS NULL` → excluded from all aggregates. Warning banner at top: `N transakcija bez EUR konverzije` if count > 0.
- Investment fetch failure (external API) → card shows error + retry button; other sections unaffected.
- Picker `from > to` → swap on client before pushing URL.
- Window crossing a year boundary → granularity logic uses absolute day diff, not calendar months.

## Testing

Vitest:

- Aggregate SQL — fixtures covering: income tx, expense tx, investment tx, transfer tx, null-eur tx. Assert: transfers excluded, null-eur excluded and counted, granularity boundary at 31 d and 90 d.
- MoM windowing — prior window length matches current; window crossing month boundary handled.
- Six-month bars — exactly six entries, current month last.
- `KpiCard` delta sign/color rendering.
- `CategoryBreakdownTable` expand/collapse behaviour.

## File touch list

New:
- `app/finance/overview/page.tsx`
- `app/finance/_actions/overview.ts`
- `app/finance/_components/OverviewPeriodPicker.tsx`
- `app/finance/_components/KpiCard.tsx`
- `app/finance/_components/CashflowChart.tsx`
- `app/finance/_components/CategoryBreakdownTable.tsx`
- `app/finance/_components/SixMonthChart.tsx`
- `app/finance/_components/InvestmentSummaryCard.tsx`
- `lib/finance/portfolioValuation.ts` (only if extraction needed)
- Tests under `test/`

Modified:
- Sidebar nav (locate finance group; add entry).
- Possibly `app/finance/portfolio/page.tsx` if valuation logic gets extracted.

# Finance Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only finance dashboard at `/finance/overview` with period picker, MoM KPIs, cashflow chart, category/subcategory breakdowns, 6-month bar chart, and live investment summary card.

**Architecture:** Server component page composes server-fetched aggregates (transactions joined to categories + types in Postgres) with a client-loaded investment card that reuses portfolio live-pricing. Pure transformation helpers live in `lib/finance/overview/*` and are unit-tested with vitest; SQL/server actions stay thin and untested (matches existing codebase pattern). All amounts in EUR using stamped `eurAmount` column.

**Tech Stack:** Next.js 16 app router, React 19 server components, drizzle-orm, Postgres, recharts, shadcn/ui (Card, Button), Tailwind, zod, vitest.

**Spec:** `docs/superpowers/specs/2026-06-11-finance-overview-design.md`

---

## File Structure

**Create:**
- `lib/finance/overview/types.ts` — shared types (`Granularity`, `AggregateRow`, `CategoryBreakdownRow`, `OverviewAggregates`, `MomComparison`, `SixMonthBar`, `InvestmentSummary`).
- `lib/finance/overview/granularity.ts` — `chooseGranularity(fromIso, toIso)` returns `'day' | 'week' | 'month'`.
- `lib/finance/overview/granularity.test.ts`
- `lib/finance/overview/buildBreakdown.ts` — pure: takes flat `{kind, categoryId, categoryName, subcategoryId, subcategoryName, eur}[]` → nested `CategoryBreakdownRow[]` sorted by total desc.
- `lib/finance/overview/buildBreakdown.test.ts`
- `lib/finance/overview/momWindow.ts` — `priorWindow(fromIso, toIso)` returns `{from, to}` for prior equal-length range.
- `lib/finance/overview/momWindow.test.ts`
- `lib/finance/overview/sixMonths.ts` — `sixMonthRange(todayIso)` returns `[{from, to, label}]` x6.
- `lib/finance/overview/sixMonths.test.ts`
- `lib/finance/overview/formatters.ts` — `fmtEur(n)`, `fmtPct(n)`, `fmtDelta(curr, prev)` returning `{pct, sign}`.
- `lib/finance/overview/formatters.test.ts`
- `app/finance/_actions/overview.ts` — server actions: `getOverviewAggregates`, `getMomComparison`, `getSixMonthBars`, `getInvestmentSummary`.
- `app/finance/_components/OverviewPeriodPicker.tsx`
- `app/finance/_components/KpiCard.tsx`
- `app/finance/_components/CashflowChart.tsx`
- `app/finance/_components/CategoryBreakdownTable.tsx`
- `app/finance/_components/SixMonthChart.tsx`
- `app/finance/_components/InvestmentSummaryCard.tsx`
- `app/finance/overview/page.tsx`

**Modify:**
- `components/nav-tree.tsx` — add "Overview" entry to `financeChildren`.

---

## Task 1: Shared types

**Files:**
- Create: `lib/finance/overview/types.ts`

- [ ] **Step 1: Create types file**

```ts
// lib/finance/overview/types.ts
export type Granularity = "day" | "week" | "month";

export type Totals = { income: number; expense: number; net: number };

export type SubBreakdownRow = {
  subcategoryId: string | null;
  subcategoryName: string;
  total: number;
};

export type CategoryBreakdownRow = {
  kind: "income" | "expense";
  categoryId: string;
  categoryName: string;
  total: number;
  subRows: SubBreakdownRow[];
};

export type CashflowBucket = {
  bucket: string; // ISO date for the start of the bucket
  income: number;
  expense: number;
};

export type OverviewAggregates = {
  totals: Totals;
  byCategory: CategoryBreakdownRow[];
  cashflowBuckets: CashflowBucket[];
  granularity: Granularity;
  excludedNullEur: number;
};

export type MomComparison = {
  current: Totals;
  prior: Totals;
};

export type SixMonthBar = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
};

export type InvestmentSummary = {
  investedInWindow: number;
  currentValue: number;
  pnlAbsolute: number;
  pnlPercent: number;
};

export type FlatBreakdownInput = {
  kind: "income" | "expense";
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  eur: number;
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/finance/overview/types.ts
git commit -m "feat(finance/overview): add shared types for overview aggregates"
```

---

## Task 2: Granularity chooser

**Files:**
- Create: `lib/finance/overview/granularity.ts`
- Test: `lib/finance/overview/granularity.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/finance/overview/granularity.test.ts
import { describe, it, expect } from "vitest";
import { chooseGranularity, daySpan } from "./granularity";

describe("chooseGranularity", () => {
  it("returns day when span <= 31 days", () => {
    expect(chooseGranularity("2026-06-01", "2026-06-30")).toBe("day"); // 30 days
    expect(chooseGranularity("2026-06-01", "2026-07-01")).toBe("day"); // 31 days inclusive
  });
  it("returns week when span between 32 and 90 days", () => {
    expect(chooseGranularity("2026-04-01", "2026-06-30")).toBe("week"); // 91 days inclusive -> still week boundary
    expect(chooseGranularity("2026-05-01", "2026-06-15")).toBe("week");
  });
  it("returns month when span > 90 days", () => {
    expect(chooseGranularity("2026-01-01", "2026-12-31")).toBe("month");
  });
  it("swaps reversed dates", () => {
    expect(chooseGranularity("2026-06-30", "2026-06-01")).toBe("day");
  });
});

describe("daySpan", () => {
  it("counts inclusive days", () => {
    expect(daySpan("2026-06-01", "2026-06-01")).toBe(1);
    expect(daySpan("2026-06-01", "2026-06-02")).toBe(2);
    expect(daySpan("2026-01-01", "2026-12-31")).toBe(365);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/finance/overview/granularity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/finance/overview/granularity.ts
import type { Granularity } from "./types";

export function daySpan(fromIso: string, toIso: string): number {
  const [a, b] = fromIso <= toIso ? [fromIso, toIso] : [toIso, fromIso];
  const start = Date.UTC(
    Number(a.slice(0, 4)),
    Number(a.slice(5, 7)) - 1,
    Number(a.slice(8, 10)),
  );
  const end = Date.UTC(
    Number(b.slice(0, 4)),
    Number(b.slice(5, 7)) - 1,
    Number(b.slice(8, 10)),
  );
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function chooseGranularity(fromIso: string, toIso: string): Granularity {
  const span = daySpan(fromIso, toIso);
  if (span <= 31) return "day";
  if (span <= 92) return "week";
  return "month";
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run lib/finance/overview/granularity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/finance/overview/granularity.ts lib/finance/overview/granularity.test.ts
git commit -m "feat(finance/overview): add granularity chooser"
```

---

## Task 3: Breakdown builder

**Files:**
- Create: `lib/finance/overview/buildBreakdown.ts`
- Test: `lib/finance/overview/buildBreakdown.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/finance/overview/buildBreakdown.test.ts
import { describe, it, expect } from "vitest";
import { buildBreakdown } from "./buildBreakdown";

const rows = [
  { kind: "expense" as const, categoryId: "c1", categoryName: "Food", subcategoryId: "s1", subcategoryName: "Groceries", eur: 100 },
  { kind: "expense" as const, categoryId: "c1", categoryName: "Food", subcategoryId: "s2", subcategoryName: "Restaurants", eur: 50 },
  { kind: "expense" as const, categoryId: "c2", categoryName: "Rent",  subcategoryId: null, subcategoryName: null, eur: 800 },
  { kind: "income" as const,  categoryId: "c3", categoryName: "Salary", subcategoryId: null, subcategoryName: null, eur: 3000 },
];

describe("buildBreakdown", () => {
  it("nests subcategories under categories", () => {
    const res = buildBreakdown(rows);
    const food = res.find((r) => r.categoryId === "c1");
    expect(food?.total).toBe(150);
    expect(food?.subRows).toHaveLength(2);
  });

  it("sorts categories by total descending", () => {
    const res = buildBreakdown(rows).filter((r) => r.kind === "expense");
    expect(res.map((r) => r.categoryId)).toEqual(["c2", "c1"]);
  });

  it("sorts subRows by total descending", () => {
    const res = buildBreakdown(rows);
    const food = res.find((r) => r.categoryId === "c1");
    expect(food?.subRows.map((s) => s.subcategoryId)).toEqual(["s1", "s2"]);
  });

  it("uses '(bez podkategorije)' label when subcategoryName is null", () => {
    const res = buildBreakdown(rows);
    const rent = res.find((r) => r.categoryId === "c2");
    expect(rent?.subRows[0]?.subcategoryName).toBe("(bez podkategorije)");
  });

  it("separates income and expense kinds", () => {
    const res = buildBreakdown(rows);
    expect(res.filter((r) => r.kind === "income")).toHaveLength(1);
    expect(res.filter((r) => r.kind === "expense")).toHaveLength(2);
  });

  it("returns empty array when no rows", () => {
    expect(buildBreakdown([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/finance/overview/buildBreakdown.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/finance/overview/buildBreakdown.ts
import type { CategoryBreakdownRow, FlatBreakdownInput } from "./types";

const NO_SUB = "(bez podkategorije)";

export function buildBreakdown(rows: FlatBreakdownInput[]): CategoryBreakdownRow[] {
  const map = new Map<string, CategoryBreakdownRow>();
  for (const r of rows) {
    const key = `${r.kind}::${r.categoryId}`;
    let cat = map.get(key);
    if (!cat) {
      cat = {
        kind: r.kind,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        total: 0,
        subRows: [],
      };
      map.set(key, cat);
    }
    cat.total += r.eur;
    const subKey = r.subcategoryId ?? "__null__";
    let sub = cat.subRows.find((s) => (s.subcategoryId ?? "__null__") === subKey);
    if (!sub) {
      sub = {
        subcategoryId: r.subcategoryId,
        subcategoryName: r.subcategoryName ?? NO_SUB,
        total: 0,
      };
      cat.subRows.push(sub);
    }
    sub.total += r.eur;
  }
  const result = Array.from(map.values());
  for (const cat of result) {
    cat.subRows.sort((a, b) => b.total - a.total);
  }
  result.sort((a, b) => b.total - a.total);
  return result;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run lib/finance/overview/buildBreakdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/finance/overview/buildBreakdown.ts lib/finance/overview/buildBreakdown.test.ts
git commit -m "feat(finance/overview): add category breakdown builder"
```

---

## Task 4: MoM window calculator

**Files:**
- Create: `lib/finance/overview/momWindow.ts`
- Test: `lib/finance/overview/momWindow.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/finance/overview/momWindow.test.ts
import { describe, it, expect } from "vitest";
import { priorWindow } from "./momWindow";

describe("priorWindow", () => {
  it("returns equal-length window immediately before current", () => {
    // 30-day window
    expect(priorWindow("2026-06-01", "2026-06-30")).toEqual({
      from: "2026-05-02",
      to: "2026-05-31",
    });
  });

  it("works for single-day window", () => {
    expect(priorWindow("2026-06-11", "2026-06-11")).toEqual({
      from: "2026-06-10",
      to: "2026-06-10",
    });
  });

  it("crosses year boundary", () => {
    expect(priorWindow("2026-01-01", "2026-01-31")).toEqual({
      from: "2025-12-02",
      to: "2025-12-31",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/finance/overview/momWindow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/finance/overview/momWindow.ts
import { daySpan } from "./granularity";

function isoUtc(year: number, month0: number, day: number): string {
  const d = new Date(Date.UTC(year, month0, day));
  return d.toISOString().slice(0, 10);
}

function shiftIso(iso: string, deltaDays: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  return isoUtc(y, m, d + deltaDays);
}

export function priorWindow(fromIso: string, toIso: string): { from: string; to: string } {
  const len = daySpan(fromIso, toIso);
  return {
    from: shiftIso(fromIso, -len),
    to: shiftIso(fromIso, -1),
  };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run lib/finance/overview/momWindow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/finance/overview/momWindow.ts lib/finance/overview/momWindow.test.ts
git commit -m "feat(finance/overview): add prior-window calculator for MoM"
```

---

## Task 5: Six-month range builder

**Files:**
- Create: `lib/finance/overview/sixMonths.ts`
- Test: `lib/finance/overview/sixMonths.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/finance/overview/sixMonths.test.ts
import { describe, it, expect } from "vitest";
import { sixMonthRange } from "./sixMonths";

describe("sixMonthRange", () => {
  it("returns six entries ending at the month containing today", () => {
    const res = sixMonthRange("2026-06-11");
    expect(res).toHaveLength(6);
    expect(res[5]?.month).toBe("2026-06");
    expect(res[0]?.month).toBe("2026-01");
  });

  it("each entry spans the full calendar month", () => {
    const res = sixMonthRange("2026-06-11");
    expect(res[5]).toEqual({ month: "2026-06", from: "2026-06-01", to: "2026-06-30" });
    expect(res[4]).toEqual({ month: "2026-05", from: "2026-05-01", to: "2026-05-31" });
  });

  it("crosses year boundary correctly", () => {
    const res = sixMonthRange("2026-02-15");
    expect(res.map((r) => r.month)).toEqual([
      "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
    ]);
  });

  it("handles February in leap years", () => {
    const res = sixMonthRange("2024-02-15");
    expect(res[5]).toEqual({ month: "2024-02", from: "2024-02-01", to: "2024-02-29" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/finance/overview/sixMonths.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/finance/overview/sixMonths.ts
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function sixMonthRange(
  todayIso: string,
): Array<{ month: string; from: string; to: string }> {
  const year = Number(todayIso.slice(0, 4));
  const month1 = Number(todayIso.slice(5, 7));
  const result: Array<{ month: string; from: string; to: string }> = [];
  for (let i = 5; i >= 0; i--) {
    let m = month1 - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const last = lastDayOfMonth(y, m);
    result.push({
      month: `${y}-${pad(m)}`,
      from: `${y}-${pad(m)}-01`,
      to: `${y}-${pad(m)}-${pad(last)}`,
    });
  }
  return result;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run lib/finance/overview/sixMonths.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/finance/overview/sixMonths.ts lib/finance/overview/sixMonths.test.ts
git commit -m "feat(finance/overview): add six-month range builder"
```

---

## Task 6: Formatters

**Files:**
- Create: `lib/finance/overview/formatters.ts`
- Test: `lib/finance/overview/formatters.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/finance/overview/formatters.test.ts
import { describe, it, expect } from "vitest";
import { fmtEur, fmtPct, fmtDelta } from "./formatters";

describe("fmtEur", () => {
  it("formats EUR with 2 decimals and sr-RS locale", () => {
    expect(fmtEur(1234.5)).toMatch(/€/);
    expect(fmtEur(0)).toMatch(/0,00/);
  });
});

describe("fmtPct", () => {
  it("formats percentage with sign", () => {
    expect(fmtPct(0.1234)).toBe("+12,3%");
    expect(fmtPct(-0.05)).toBe("-5,0%");
    expect(fmtPct(0)).toBe("0,0%");
  });
});

describe("fmtDelta", () => {
  it("returns null when prior is zero", () => {
    expect(fmtDelta(100, 0)).toEqual({ pct: null, sign: 0 });
  });
  it("returns positive delta", () => {
    expect(fmtDelta(120, 100)).toEqual({ pct: 0.2, sign: 1 });
  });
  it("returns negative delta", () => {
    expect(fmtDelta(80, 100)).toEqual({ pct: -0.2, sign: -1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/finance/overview/formatters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/finance/overview/formatters.ts
export function fmtEur(n: number): string {
  return n.toLocaleString("sr-RS", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(n: number): string {
  const pct = n * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  const abs = Math.abs(pct).toLocaleString("sr-RS", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${abs}%`;
}

export function fmtDelta(curr: number, prior: number): { pct: number | null; sign: -1 | 0 | 1 } {
  if (prior === 0) return { pct: null, sign: 0 };
  const pct = (curr - prior) / Math.abs(prior);
  const sign: -1 | 0 | 1 = pct > 0 ? 1 : pct < 0 ? -1 : 0;
  return { pct, sign };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run lib/finance/overview/formatters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/finance/overview/formatters.ts lib/finance/overview/formatters.test.ts
git commit -m "feat(finance/overview): add EUR/percentage/delta formatters"
```

---

## Task 7: Server action — getOverviewAggregates

**Files:**
- Create: `app/finance/_actions/overview.ts`

This task wires SQL fetches to the pure helpers. No tests (matches existing `app/finance/_actions/*` convention).

- [ ] **Step 1: Create file with overview aggregates action**

```ts
// app/finance/_actions/overview.ts
"use server";

import { and, between, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  transaction,
  transactionCategory,
  transactionSubcategory,
  transactionType,
} from "@/db/schema/finance";
import { buildBreakdown } from "@/lib/finance/overview/buildBreakdown";
import { chooseGranularity } from "@/lib/finance/overview/granularity";
import { priorWindow } from "@/lib/finance/overview/momWindow";
import { sixMonthRange } from "@/lib/finance/overview/sixMonths";
import type {
  FlatBreakdownInput,
  Granularity,
  MomComparison,
  OverviewAggregates,
  SixMonthBar,
  Totals,
} from "@/lib/finance/overview/types";

function toIsoDate(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

function n(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

async function fetchTotalsAndBreakdown(from: string, to: string): Promise<{
  totals: Totals;
  byCategory: ReturnType<typeof buildBreakdown>;
  excludedNullEur: number;
}> {
  const rows = await db
    .select({
      kind: transactionCategory.kind,
      categoryId: transactionCategory.id,
      categoryName: transactionCategory.name,
      subcategoryId: transactionSubcategory.id,
      subcategoryName: transactionSubcategory.name,
      eurAmount: transaction.eurAmount,
    })
    .from(transaction)
    .innerJoin(transactionType, eq(transactionType.key, transaction.type))
    .innerJoin(transactionCategory, eq(transactionCategory.id, transaction.categoryId))
    .leftJoin(
      transactionSubcategory,
      eq(transactionSubcategory.id, transaction.subcategoryId),
    )
    .where(
      and(
        between(transaction.occurredOn, from, to),
        isNotNull(transactionType.categoryKind),
        isNotNull(transaction.eurAmount),
      ),
    );

  const [{ excluded }] = await db
    .select({
      excluded: sql<number>`count(*)::int`,
    })
    .from(transaction)
    .innerJoin(transactionType, eq(transactionType.key, transaction.type))
    .where(
      and(
        between(transaction.occurredOn, from, to),
        isNotNull(transactionType.categoryKind),
        isNull(transaction.eurAmount),
      ),
    );

  const flat: FlatBreakdownInput[] = [];
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.kind === "investment") continue; // exclude from spend/income breakdown
    const eur = n(r.eurAmount);
    flat.push({
      kind: r.kind as "income" | "expense",
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      subcategoryId: r.subcategoryId,
      subcategoryName: r.subcategoryName,
      eur,
    });
    if (r.kind === "income") income += eur;
    else expense += eur;
  }

  return {
    totals: { income, expense, net: income - expense },
    byCategory: buildBreakdown(flat),
    excludedNullEur: Number(excluded ?? 0),
  };
}

async function fetchCashflow(
  from: string,
  to: string,
  granularity: Granularity,
): Promise<OverviewAggregates["cashflowBuckets"]> {
  const truncUnit = granularity; // 'day' | 'week' | 'month' all valid for date_trunc
  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc(${truncUnit}, ${transaction.occurredOn}::timestamp), 'YYYY-MM-DD')`,
      kind: transactionCategory.kind,
      eurSum: sql<string>`sum(${transaction.eurAmount})`,
    })
    .from(transaction)
    .innerJoin(transactionType, eq(transactionType.key, transaction.type))
    .innerJoin(transactionCategory, eq(transactionCategory.id, transaction.categoryId))
    .where(
      and(
        between(transaction.occurredOn, from, to),
        isNotNull(transactionType.categoryKind),
        isNotNull(transaction.eurAmount),
      ),
    )
    .groupBy(
      sql`date_trunc(${truncUnit}, ${transaction.occurredOn}::timestamp)`,
      transactionCategory.kind,
    );

  const map = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    if (r.kind === "investment") continue;
    const b = map.get(r.bucket) ?? { income: 0, expense: 0 };
    const v = n(r.eurSum);
    if (r.kind === "income") b.income += v;
    else b.expense += v;
    map.set(r.bucket, b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, v]) => ({ bucket, income: v.income, expense: v.expense }));
}

export async function getOverviewAggregates(
  from: string,
  to: string,
): Promise<OverviewAggregates> {
  const granularity = chooseGranularity(from, to);
  const [{ totals, byCategory, excludedNullEur }, cashflowBuckets] = await Promise.all([
    fetchTotalsAndBreakdown(from, to),
    fetchCashflow(from, to, granularity),
  ]);
  return { totals, byCategory, cashflowBuckets, granularity, excludedNullEur };
}

export async function getMomComparison(from: string, to: string): Promise<MomComparison> {
  const prior = priorWindow(from, to);
  const [current, priorAgg] = await Promise.all([
    fetchTotalsAndBreakdown(from, to),
    fetchTotalsAndBreakdown(prior.from, prior.to),
  ]);
  return { current: current.totals, prior: priorAgg.totals };
}

export async function getSixMonthBars(todayIso: string): Promise<SixMonthBar[]> {
  const months = sixMonthRange(todayIso);
  const results = await Promise.all(
    months.map(async (m) => {
      const agg = await fetchTotalsAndBreakdown(m.from, m.to);
      return { month: m.month, income: agg.totals.income, expense: agg.totals.expense };
    }),
  );
  return results;
}

// Re-export for typing convenience in client components
export type { OverviewAggregates, MomComparison, SixMonthBar } from "@/lib/finance/overview/types";
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/finance/_actions/overview.ts
git commit -m "feat(finance/overview): add server actions for aggregates, MoM, six-month bars"
```

---

## Task 8: Server action — getInvestmentSummary

**Files:**
- Modify: `app/finance/_actions/overview.ts`

- [ ] **Step 1: Inspect existing portfolio helper**

Run: `cat lib/finance/portfolio.ts | head -60`
Look for an exported function returning `{ netWorthEur, rows }` or similar. Note its name and signature.

- [ ] **Step 2: Append `getInvestmentSummary` to `app/finance/_actions/overview.ts`**

Add these imports at the top of the file:

```ts
import { getPortfolio } from "@/lib/finance/portfolio";
```

Append at the bottom (before the type re-exports):

```ts
export async function getInvestmentSummary(
  from: string,
  to: string,
): Promise<import("@/lib/finance/overview/types").InvestmentSummary> {
  // Sum of investment-kind outflows in window, in EUR.
  const rows = await db
    .select({
      eurAmount: transaction.eurAmount,
      outflowAmount: transaction.outflowAmount,
    })
    .from(transaction)
    .innerJoin(transactionType, eq(transactionType.key, transaction.type))
    .innerJoin(transactionCategory, eq(transactionCategory.id, transaction.categoryId))
    .where(
      and(
        between(transaction.occurredOn, from, to),
        eq(transactionCategory.kind, "investment"),
        isNotNull(transaction.eurAmount),
        isNotNull(transaction.outflowAmount),
      ),
    );

  let investedInWindow = 0;
  for (const r of rows) investedInWindow += n(r.eurAmount);

  // Live valuation across all investment-bearing accounts via existing portfolio helper.
  const portfolio = await getPortfolio();
  const currentValue = portfolio.netWorthEur ?? 0;

  const pnlAbsolute = currentValue - investedInWindow;
  const pnlPercent = investedInWindow === 0 ? 0 : pnlAbsolute / investedInWindow;

  return { investedInWindow, currentValue, pnlAbsolute, pnlPercent };
}
```

NOTE: If the inspection in Step 1 shows that `getPortfolio` returns a different shape, adjust the `currentValue` derivation to use the equivalent EUR net-worth field. If it lacks a per-asset-group filter, leave as-is — this iteration shows total net worth as the "current value" since investment accounts are not separately tagged in schema. Document this trade-off as a comment above the assignment.

Add this comment above the `currentValue` line:

```ts
// NOTE: portfolio helper returns total net worth across all accounts; refining to
// "investment-only" accounts requires an asset-group tag that does not yet exist.
// Tracked as a follow-up; for now we surface net worth as proxy for current value.
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/finance/_actions/overview.ts
git commit -m "feat(finance/overview): add investment summary server action"
```

---

## Task 9: OverviewPeriodPicker (client)

**Files:**
- Create: `app/finance/_components/OverviewPeriodPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/_components/OverviewPeriodPicker.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function thisMonth(today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}

function lastMonth(today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const py = prev.getUTCFullYear();
  const pm = prev.getUTCMonth();
  const last = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
  return { from: `${py}-${pad(pm + 1)}-01`, to: `${py}-${pad(pm + 1)}-${pad(last)}` };
}

function ytd(today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  return { from: `${y}-01-01`, to: today.toISOString().slice(0, 10) };
}

export function OverviewPeriodPicker({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [pending, startTransition] = useTransition();

  function push(nextFrom: string, nextTo: string) {
    const [f, t] = nextFrom <= nextTo ? [nextFrom, nextTo] : [nextTo, nextFrom];
    const params = new URLSearchParams(search.toString());
    params.set("from", f);
    params.set("to", t);
    startTransition(() => {
      router.replace(`/finance/overview?${params.toString()}`);
    });
  }

  function applyPreset(p: { from: string; to: string }) {
    setFrom(p.from);
    setTo(p.to);
    push(p.from, p.to);
  }

  const today = new Date();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => applyPreset(thisMonth(today))}>
          Ovaj mesec
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset(lastMonth(today))}>
          Prošli mesec
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset(ytd(today))}>
          YTD
        </Button>
      </div>
      <div className="flex items-end gap-2">
        <label className="text-xs text-muted-foreground flex flex-col">
          Od
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground flex flex-col">
          Do
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <Button size="sm" onClick={() => push(from, to)} disabled={pending}>
          Primeni
        </Button>
      </div>
      <div className="ml-auto text-sm text-muted-foreground">Valuta: EUR</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify Button component exists**

Run: `ls components/ui/button.tsx`
Expected: file exists. If not, install via shadcn or fall back to a styled `<button>` with the same Tailwind classes used elsewhere in the codebase.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/finance/_components/OverviewPeriodPicker.tsx
git commit -m "feat(finance/overview): add period picker with presets and date inputs"
```

---

## Task 10: KpiCard

**Files:**
- Create: `app/finance/_components/KpiCard.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/_components/KpiCard.tsx
import { Card } from "@/components/ui/card";
import { fmtEur, fmtPct } from "@/lib/finance/overview/formatters";

export function KpiCard({
  label,
  value,
  delta,
  favorable,
}: {
  label: string;
  value: number;
  delta: { pct: number | null; sign: -1 | 0 | 1 };
  // Sign that should be displayed in green. For income/net: positive is favorable.
  // For expense: negative is favorable.
  favorable: "positive" | "negative";
}) {
  let color = "text-muted-foreground";
  if (delta.pct != null && delta.sign !== 0) {
    const good = favorable === "positive" ? delta.sign === 1 : delta.sign === -1;
    color = good ? "text-emerald-600" : "text-rose-600";
  }

  return (
    <Card className="p-4 space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{fmtEur(value)}</div>
      <div className={`text-xs tabular-nums ${color}`}>
        {delta.pct == null ? "—" : `${fmtPct(delta.pct)} vs prethodni period`}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/KpiCard.tsx
git commit -m "feat(finance/overview): add KPI card with delta vs prior period"
```

---

## Task 11: CashflowChart

**Files:**
- Create: `app/finance/_components/CashflowChart.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/_components/CashflowChart.tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Legend,
} from "recharts";
import type { CashflowBucket, Granularity } from "@/lib/finance/overview/types";

export function CashflowChart({
  buckets,
  granularity,
}: {
  buckets: CashflowBucket[];
  granularity: Granularity;
}) {
  if (buckets.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">Nema podataka</div>
    );
  }
  const data = buckets.map((b) => ({
    bucket: b.bucket,
    income: Number(b.income.toFixed(2)),
    expense: Number(b.expense.toFixed(2)),
    net: Number((b.income - b.expense).toFixed(2)),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) =>
              v.toLocaleString("sr-RS", { maximumFractionDigits: 2 })
            }
          />
          <Legend />
          <Bar dataKey="income" name="Prihod" fill="#10b981" />
          <Bar dataKey="expense" name="Trošak" fill="#ef4444" />
          <Line dataKey="net" name="Neto" stroke="#3b82f6" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-muted-foreground text-right">
        granularity: {granularity}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/CashflowChart.tsx
git commit -m "feat(finance/overview): add cashflow chart (income/expense bars + net line)"
```

---

## Task 12: CategoryBreakdownTable

**Files:**
- Create: `app/finance/_components/CategoryBreakdownTable.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/_components/CategoryBreakdownTable.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fmtEur } from "@/lib/finance/overview/formatters";
import type { CategoryBreakdownRow } from "@/lib/finance/overview/types";

export function CategoryBreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: CategoryBreakdownRow[];
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 text-sm font-medium border-b">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nema podataka</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((cat) => {
              const isOpen = open.has(cat.categoryId);
              return (
                <>
                  <tr
                    key={cat.categoryId}
                    className="border-t cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(cat.categoryId)}
                  >
                    <td className="px-4 py-2 w-6">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-2 py-2">{cat.categoryName}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {fmtEur(cat.total)}
                    </td>
                  </tr>
                  {isOpen &&
                    cat.subRows.map((sub) => (
                      <tr
                        key={`${cat.categoryId}::${sub.subcategoryId ?? "null"}`}
                        className="border-t bg-muted/20"
                      >
                        <td className="px-4 py-1.5" />
                        <td className="px-2 py-1.5 pl-6 text-muted-foreground">
                          {sub.subcategoryName}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {fmtEur(sub.total)}
                        </td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS — note: React 19 may warn about missing keys on fragment-less `<>`. If it errors, wrap the inner `<tr>` pair in a keyed `<Fragment key={cat.categoryId}>`.

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/CategoryBreakdownTable.tsx
git commit -m "feat(finance/overview): add collapsible category breakdown table"
```

---

## Task 13: SixMonthChart

**Files:**
- Create: `app/finance/_components/SixMonthChart.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/_components/SixMonthChart.tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SixMonthBar } from "@/lib/finance/overview/types";

export function SixMonthChart({ data }: { data: SixMonthBar[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Nema podataka</div>;
  }
  const shaped = data.map((d) => ({
    month: d.month,
    income: Number(d.income.toFixed(2)),
    expense: Number(d.expense.toFixed(2)),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={shaped} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) =>
              v.toLocaleString("sr-RS", { maximumFractionDigits: 2 })
            }
          />
          <Legend />
          <Bar dataKey="income" name="Prihod" fill="#10b981" />
          <Bar dataKey="expense" name="Trošak" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/SixMonthChart.tsx
git commit -m "feat(finance/overview): add six-month income vs expense bar chart"
```

---

## Task 14: InvestmentSummaryCard (client-loaded)

**Files:**
- Create: `app/finance/_components/InvestmentSummaryCard.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/_components/InvestmentSummaryCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInvestmentSummary } from "../_actions/overview";
import { fmtEur, fmtPct } from "@/lib/finance/overview/formatters";
import type { InvestmentSummary } from "@/lib/finance/overview/types";

export function InvestmentSummaryCard({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<InvestmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInvestmentSummary(from, to)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Greška");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, attempt]);

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">Investicije</div>
        <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">Investicije</div>
        <div className="text-sm text-rose-600">Greška: {error}</div>
        <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}>
          Pokušaj ponovo
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const pnlColor = data.pnlAbsolute >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Investicije</div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Uloženo u periodu</div>
          <div className="text-lg tabular-nums">{fmtEur(data.investedInWindow)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Trenutna vrednost</div>
          <div className="text-lg tabular-nums">{fmtEur(data.currentValue)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground">Nerealizovani P/L</div>
          <div className={`text-lg tabular-nums ${pnlColor}`}>
            {fmtEur(data.pnlAbsolute)} ({fmtPct(data.pnlPercent)})
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/finance/_components/InvestmentSummaryCard.tsx
git commit -m "feat(finance/overview): add client-loaded investment summary card"
```

---

## Task 15: Overview page

**Files:**
- Create: `app/finance/overview/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/finance/overview/page.tsx
import {
  getMomComparison,
  getOverviewAggregates,
  getSixMonthBars,
} from "../_actions/overview";
import { OverviewPeriodPicker } from "../_components/OverviewPeriodPicker";
import { KpiCard } from "../_components/KpiCard";
import { CashflowChart } from "../_components/CashflowChart";
import { CategoryBreakdownTable } from "../_components/CategoryBreakdownTable";
import { SixMonthChart } from "../_components/SixMonthChart";
import { InvestmentSummaryCard } from "../_components/InvestmentSummaryCard";
import { fmtDelta } from "@/lib/finance/overview/formatters";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}

function parseRange(sp: { from?: string | string[]; to?: string | string[] }): {
  from: string;
  to: string;
} {
  const def = defaultRange();
  const rawFrom = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  const rawTo = Array.isArray(sp.to) ? sp.to[0] : sp.to;
  const isIso = (s: string | undefined): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  let from = isIso(rawFrom) ? rawFrom : def.from;
  let to = isIso(rawTo) ? rawTo : def.to;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

export default async function FinanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}) {
  const sp = await searchParams;
  const { from, to } = parseRange(sp);
  const todayIso = new Date().toISOString().slice(0, 10);

  const [aggregates, mom, sixMonth] = await Promise.all([
    getOverviewAggregates(from, to),
    getMomComparison(from, to),
    getSixMonthBars(todayIso),
  ]);

  const incomeDelta = fmtDelta(mom.current.income, mom.prior.income);
  const expenseDelta = fmtDelta(mom.current.expense, mom.prior.expense);
  const netDelta = fmtDelta(mom.current.net, mom.prior.net);

  const expenseRows = aggregates.byCategory.filter((r) => r.kind === "expense");
  const incomeRows = aggregates.byCategory.filter((r) => r.kind === "income");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pregled</h1>
        <p className="text-sm text-muted-foreground">
          Prihodi, troškovi i investicije po periodu (sve u EUR).
        </p>
      </div>

      <OverviewPeriodPicker initialFrom={from} initialTo={to} />

      {aggregates.excludedNullEur > 0 && (
        <Card className="p-3 text-sm text-amber-700 bg-amber-50 border-amber-200">
          {aggregates.excludedNullEur} transakcija bez EUR konverzije nije uračunato.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Prihod"
          value={mom.current.income}
          delta={incomeDelta}
          favorable="positive"
        />
        <KpiCard
          label="Trošak"
          value={mom.current.expense}
          delta={expenseDelta}
          favorable="negative"
        />
        <KpiCard
          label="Neto"
          value={mom.current.net}
          delta={netDelta}
          favorable="positive"
        />
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Tok novca</div>
        <CashflowChart
          buckets={aggregates.cashflowBuckets}
          granularity={aggregates.granularity}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryBreakdownTable title="Trošak po kategoriji" rows={expenseRows} />
        <CategoryBreakdownTable title="Prihod po kategoriji" rows={incomeRows} />
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Poslednjih 6 meseci</div>
        <SixMonthChart data={sixMonth} />
      </Card>

      <InvestmentSummaryCard from={from} to={to} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Manually visit page in dev**

Run: `pnpm dev` (in another shell) and visit `http://localhost:3000/finance/overview`.

Verify:
- Page renders with current-month default
- Period picker changes URL and re-fetches
- Cards show numbers, charts render, breakdown tables expand/collapse
- Investment card loads after page (skeleton briefly visible)

- [ ] **Step 4: Commit**

```bash
git add app/finance/overview/page.tsx
git commit -m "feat(finance/overview): add overview page composing all sections"
```

---

## Task 16: Sidebar nav entry

**Files:**
- Modify: `components/nav-tree.tsx`

- [ ] **Step 1: Inspect current entries**

Read lines 60-80 of `components/nav-tree.tsx`. Note the icon import style for the existing finance children.

- [ ] **Step 2: Add Overview entry**

Find:

```ts
const financeChildren: LeafItem[] = [
  { href: "/finance/configuration", label: "Configuration", icon: Settings2 },
  { href: "/finance/transactions", label: "Transactions", icon: ListTodo },
  { href: "/finance/portfolio", label: "Portfolio", icon: Wallet },
];
```

Change to (use whichever icon-import style the file already uses; `BarChart3` is a common choice for an overview/analytics entry — add it to the existing `lucide-react` import):

```ts
const financeChildren: LeafItem[] = [
  { href: "/finance/overview", label: "Overview", icon: BarChart3 },
  { href: "/finance/transactions", label: "Transactions", icon: ListTodo },
  { href: "/finance/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/finance/configuration", label: "Configuration", icon: Settings2 },
];
```

At the top of the file, ensure `BarChart3` is imported from `lucide-react` alongside the other icons.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Visit dev and confirm sidebar entry appears**

Confirm the Overview entry shows up in the Finance group and navigates to `/finance/overview`.

- [ ] **Step 5: Commit**

```bash
git add components/nav-tree.tsx
git commit -m "feat(finance/overview): add sidebar nav entry"
```

---

## Task 17: Full test + lint sweep

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: all tests pass (new tests + existing).

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (no warnings/errors).

- [ ] **Step 4: Final smoke test in browser**

Visit `/finance/overview` with various windows (default, last month, YTD, custom 6-month range) and confirm:
- Granularity switches (day → week → month) as window grows
- KPI deltas change color appropriately
- Drill-down expand/collapse works
- Investment card loads asynchronously
- Empty windows show "Nema podataka" placeholders

- [ ] **Step 5: (Optional) Commit any lint-fix tweaks**

```bash
git status
# If anything residual:
git add -p
git commit -m "chore(finance/overview): lint/format sweep"
```

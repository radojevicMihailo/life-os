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
import { getPortfolio } from "@/lib/finance/portfolio";
import type {
  FlatBreakdownInput,
  Granularity,
  MomComparison,
  OverviewAggregates,
  SixMonthBar,
  Totals,
} from "@/lib/finance/overview/types";

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
    if (r.kind === "investment") continue;
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
  const truncUnit = granularity;
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

export async function getInvestmentSummary(
  from: string,
  to: string,
): Promise<import("@/lib/finance/overview/types").InvestmentSummary> {
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

  // NOTE: portfolio helper returns total net worth across all accounts; refining to
  // "investment-only" accounts requires an asset-group tag that does not yet exist.
  // Tracked as a follow-up; for now we surface net worth as proxy for current value.
  const portfolio = await getPortfolio();
  const currentValue = portfolio.netWorthEur ?? 0;

  const pnlAbsolute = currentValue - investedInWindow;
  const pnlPercent = investedInWindow === 0 ? 0 : pnlAbsolute / investedInWindow;

  return { investedInWindow, currentValue, pnlAbsolute, pnlPercent };
}

export type { OverviewAggregates, MomComparison, SixMonthBar } from "@/lib/finance/overview/types";

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

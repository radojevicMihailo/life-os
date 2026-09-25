import Decimal from "decimal.js";

import type { AccountClassification } from "./ledger";

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_UP,
});

const MIN_BUDGET_YEAR = 1900;
const MAX_BUDGET_YEAR = 2100;
const BUDGET_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const BELGRADE_MONTH_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "2-digit",
  timeZone: "Europe/Belgrade",
  year: "numeric",
});

function decimalString(value: Decimal.Value) {
  return new ExactDecimal(value).toString();
}

function parseBudgetMonth(month: string) {
  const match = BUDGET_MONTH_PATTERN.exec(month);
  const year = Number(match?.[1]);
  const monthNumber = Number(match?.[2]);

  if (!match || year < MIN_BUDGET_YEAR || year > MAX_BUDGET_YEAR) {
    throw new RangeError("Budget month is out of range");
  }

  return { monthNumber, year };
}

export function isSupportedBudgetMonth(month: string) {
  try {
    parseBudgetMonth(month);
    return true;
  } catch {
    return false;
  }
}

export function nextBudgetMonth(month: string) {
  const { monthNumber, year } = parseBudgetMonth(month);

  if (monthNumber === 12) {
    if (year === MAX_BUDGET_YEAR) {
      throw new RangeError("Budget month overflow");
    }

    return `${year + 1}-01`;
  }

  return `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
}

export function budgetMonth(occurredAt: Date): string {
  const parts = BELGRADE_MONTH_FORMATTER.formatToParts(occurredAt);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Could not derive Europe/Belgrade budget month");
  }

  return `${year}-${month}`;
}

export function calculatePeriod(input: {
  base: Decimal.Value;
  carryIn: Decimal.Value;
  eligibleSpending: Decimal.Value;
}) {
  const available = new ExactDecimal(input.base).plus(input.carryIn);
  const remaining = available.minus(input.eligibleSpending);

  return {
    available: decimalString(available),
    remaining: decimalString(remaining),
  };
}

export function isEligibleBudgetExpense(input: {
  accountClassification: AccountClassification;
  categoryId?: string | null;
}) {
  return input.accountClassification === "expense" && Boolean(input.categoryId);
}

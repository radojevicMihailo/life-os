import Decimal from "decimal.js";

import {
  budgetMonth,
  calculatePeriod,
  isEligibleBudgetExpense,
  isSupportedBudgetMonth,
  nextBudgetMonth,
} from "../domain/budgets";
import type { JournalDraft } from "../domain/ledger";
import { Money, defineCurrency } from "../domain/money";
import { CategoriesRepository } from "../db/repositories/categories";
import {
  BudgetsRepository,
  type BudgetPeriodRecord,
} from "../db/repositories/budgets";
import type { DbTx } from "../db/client";
import {
  applicationError,
  type ApplicationDependencies,
} from "./ports";

export interface SetBudgetLimitInput {
  categoryId: string;
  month: string;
  currencyCode: string;
  amount: string;
}

export interface RecomputeBudgetSeriesInput {
  categoryId: string;
  fromMonth: string;
}

function assertMonth(month: string) {
  if (!isSupportedBudgetMonth(month)) {
    applicationError("budget_month_invalid");
  }

  return month;
}

function normalizeName(value: string) {
  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    applicationError("currency_invalid");
  }

  return normalized;
}

async function assertExpenseCategory(
  tx: DbTx,
  categoryId: string,
) {
  const category = (await lockBudgetCategories(tx, [categoryId]))[0];

  if (!category) {
    applicationError("category_not_found");
  }
  if (!category.isActive) {
    applicationError("category_inactive");
  }
  if (category.classification !== "expense") {
    applicationError("category_classification_mismatch");
  }
}

export async function lockBudgetCategories(tx: DbTx, categoryIds: string[]) {
  return new CategoriesRepository(tx).lockByIds(categoryIds);
}

export async function recomputeBudgetSeriesInTransaction(
  deps: ApplicationDependencies,
  tx: DbTx,
  input: RecomputeBudgetSeriesInput,
) {
  assertMonth(input.fromMonth);
  const budgets = new BudgetsRepository(tx);
  const limits = await budgets.listLimits(input.categoryId);

  if (limits.length === 0) {
    return [];
  }

  for (const limit of limits) {
    assertMonth(limit.month);
  }
  const start = limits[0]?.month ?? applicationError("currency_not_found");
  const currencyCode = limits[0]?.currencyCode ?? applicationError("currency_not_found");
  if (limits.some((limit) => limit.currencyCode !== currencyCode)) {
    applicationError("budget_currency_mismatch");
  }

  const spending = (await budgets.listEligibleSpending(input.categoryId, currencyCode))
    .filter((period) => {
      assertMonth(period.month);
      return period.month >= start;
    });
  const currentMonth = assertMonth(budgetMonth(deps.clock.now()));
  const end = [
    currentMonth,
    ...limits.map((limit) => limit.month),
    ...spending.map((period) => period.month),
  ].sort().at(-1) ?? currentMonth;
  const limitsByMonth = new Map(limits.map((limit) => [limit.month, limit.amount]));
  const spendingByMonth = new Map(spending.map((period) => [period.month, period.amount]));
  const now = deps.clock.now();
  const periods: BudgetPeriodRecord[] = [];
  let carryIn = "0";

  for (let month = start; ; month = nextBudgetMonth(month)) {
    const limitAmount = limitsByMonth.get(month) ?? "0";
    const spendingAmount = spendingByMonth.get(month) ?? "0";
    const calculated = calculatePeriod({
      base: limitAmount,
      carryIn,
      eligibleSpending: spendingAmount,
    });
    periods.push({
      id: deps.ids.nextId("budgetPeriod"),
      categoryId: input.categoryId,
      currencyCode,
      month,
      limitAmount: new Decimal(limitAmount).toFixed(18),
      carryInAmount: new Decimal(carryIn).toFixed(18),
      spendingAmount: new Decimal(spendingAmount).toFixed(18),
      remainingAmount: new Decimal(calculated.remaining).toFixed(18),
      recomputedAt: now,
    });
    carryIn = calculated.remaining;

    if (month === end) {
      break;
    }
  }

  await budgets.deletePeriodsBefore(input.categoryId, start);
  await budgets.replacePeriods(periods);
  return periods;
}

export async function recomputeBudgetSeries(
  deps: ApplicationDependencies,
  input: RecomputeBudgetSeriesInput,
) {
  return deps.unitOfWork.run(async (tx) => {
    await assertExpenseCategory(tx, input.categoryId);
    return recomputeBudgetSeriesInTransaction(deps, tx, input);
  });
}

export async function setBudgetLimit(
  deps: ApplicationDependencies,
  input: SetBudgetLimitInput,
) {
  return deps.unitOfWork.run(async (tx) => {
    const month = assertMonth(input.month);
    const currencyCode = normalizeName(input.currencyCode);
    await assertExpenseCategory(tx, input.categoryId);
    const budgets = new BudgetsRepository(tx);
    const minorUnit = await budgets.currencyMinorUnit(currencyCode);
    const amount = Money.parse(
      input.amount,
      defineCurrency({ code: currencyCode, minorUnit }),
    ).amount;
    const now = deps.clock.now();

    await budgets.upsertLimit({
      amount,
      categoryId: input.categoryId,
      currencyCode,
      id: deps.ids.nextId("budgetLimit"),
      month,
      now,
    });

    return recomputeBudgetSeriesInTransaction(deps, tx, {
      categoryId: input.categoryId,
      fromMonth: month,
    });
  });
}

export async function recomputeBudgetSeriesForDrafts(
  deps: ApplicationDependencies,
  tx: DbTx,
  drafts: JournalDraft[],
) {
  const earliestMonthByCategory = new Map<string, string>();

  for (const draft of drafts) {
    const month = budgetMonth(draft.occurredAt ?? deps.clock.now());
    for (const posting of draft.postings) {
      const categoryId = posting.categoryId;
      if (!categoryId || !isEligibleBudgetExpense({
        accountClassification: posting.account.classification,
        categoryId,
      })) {
        continue;
      }

      const previous = earliestMonthByCategory.get(categoryId);
      if (!previous || month < previous) {
        earliestMonthByCategory.set(categoryId, month);
      }
    }
  }

  const orderedCategories = [...earliestMonthByCategory.entries()]
    .sort(([left], [right]) => left.localeCompare(right));
  await lockBudgetCategories(
    tx,
    orderedCategories.map(([categoryId]) => categoryId),
  );
  const recomputed = [];

  for (const [categoryId, fromMonth] of orderedCategories) {
    recomputed.push(
      await recomputeBudgetSeriesInTransaction(deps, tx, { categoryId, fromMonth }),
    );
  }

  return recomputed;
}

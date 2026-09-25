import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import { budgetMonth } from "../domain/budgets";
import { budgetPeriods, categories } from "../db/schema";
import { canonicalDecimal } from "./common";

export interface BudgetReadModelItem {
  categoryId: string;
  categoryName: string;
  currencyCode: string;
  limitAmount: string;
  carryInAmount: string;
  availableAmount: string;
  spendingAmount: string;
  remainingAmount: string;
  recomputedAt: Date;
}

export async function listBudgets(
  dependencies: ApplicationDependencies,
  input: { month?: string } = {},
) {
  const month = input.month ?? budgetMonth(dependencies.clock.now());

  return dependencies.unitOfWork.run(async (tx) => {
    const rows = await tx
      .select({
        carryInAmount: budgetPeriods.carryInAmount,
        categoryId: budgetPeriods.categoryId,
        categoryName: categories.name,
        currencyCode: budgetPeriods.currencyCode,
        limitAmount: budgetPeriods.limitAmount,
        recomputedAt: budgetPeriods.recomputedAt,
        remainingAmount: budgetPeriods.remainingAmount,
        spendingAmount: budgetPeriods.spendingAmount,
      })
      .from(budgetPeriods)
      .innerJoin(categories, eq(categories.id, budgetPeriods.categoryId))
      .where(
        and(
          eq(budgetPeriods.month, `${month}-01`),
          eq(categories.classification, "expense"),
        ),
      )
      .orderBy(categories.name, categories.id);

    return {
      items: rows.map((row) => ({
        ...row,
        availableAmount: canonicalDecimal(
          new Decimal(row.limitAmount).plus(row.carryInAmount),
        ),
        carryInAmount: canonicalDecimal(row.carryInAmount),
        limitAmount: canonicalDecimal(row.limitAmount),
        remainingAmount: canonicalDecimal(row.remainingAmount),
        spendingAmount: canonicalDecimal(row.spendingAmount),
      } satisfies BudgetReadModelItem)),
      month,
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

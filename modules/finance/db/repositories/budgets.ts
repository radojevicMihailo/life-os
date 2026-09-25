import { and, asc, eq, lt, sql } from "drizzle-orm";

import { applicationError } from "../../application/ports";
import type { DbTx } from "../client";
import {
  accounts,
  budgetLimits,
  budgetPeriods,
  categories,
  currencies,
  journalPostings,
  journalTransactions,
} from "../schema";

export interface BudgetLimitRecord {
  categoryId: string;
  currencyCode: string;
  month: string;
  amount: string;
}

export interface BudgetSpendingRecord {
  month: string;
  amount: string;
}

export interface BudgetPeriodRecord {
  id: string;
  categoryId: string;
  currencyCode: string;
  month: string;
  limitAmount: string;
  carryInAmount: string;
  spendingAmount: string;
  remainingAmount: string;
  recomputedAt: Date;
}

const BELGRADE_MONTH = sql<string>`to_char(${journalTransactions.occurredAt} at time zone 'Europe/Belgrade', 'YYYY-MM')`;

export class BudgetsRepository {
  constructor(private readonly tx: DbTx) {}

  async currencyMinorUnit(currencyCode: string): Promise<number> {
    const [currency] = await this.tx
      .select({ minorUnit: currencies.minorUnit })
      .from(currencies)
      .where(
        and(
          eq(currencies.code, currencyCode),
          eq(currencies.isActive, true),
        ),
      );

    if (!currency || !/^\d+$/.test(currency.minorUnit)) {
      applicationError("currency_not_found");
    }

    return Number(currency.minorUnit);
  }

  async upsertLimit(input: {
    id: string;
    categoryId: string;
    currencyCode: string;
    month: string;
    amount: string;
    now: Date;
  }): Promise<void> {
    const existing = await this.tx
      .select({ currencyCode: budgetLimits.currencyCode })
      .from(budgetLimits)
      .where(eq(budgetLimits.categoryId, input.categoryId))
      .for("update");

    if (existing.some((limit) => limit.currencyCode !== input.currencyCode)) {
      applicationError("budget_currency_mismatch");
    }

    await this.tx
      .insert(budgetLimits)
      .values({
        id: input.id,
        categoryId: input.categoryId,
        currencyCode: input.currencyCode,
        month: `${input.month}-01`,
        amount: input.amount,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [budgetLimits.categoryId, budgetLimits.month],
        set: {
          amount: input.amount,
          currencyCode: input.currencyCode,
          updatedAt: input.now,
        },
      });
  }

  async listLimits(categoryId: string): Promise<BudgetLimitRecord[]> {
    const rows = await this.tx
      .select({
        amount: budgetLimits.amount,
        categoryId: budgetLimits.categoryId,
        currencyCode: budgetLimits.currencyCode,
        month: budgetLimits.month,
      })
      .from(budgetLimits)
      .where(eq(budgetLimits.categoryId, categoryId))
      .orderBy(asc(budgetLimits.month));

    return rows.map((row) => ({
      amount: row.amount,
      categoryId: row.categoryId,
      currencyCode: row.currencyCode,
      month: row.month.slice(0, 7),
    }));
  }

  async listEligibleSpending(
    categoryId: string,
    currencyCode: string,
  ): Promise<BudgetSpendingRecord[]> {
    const rows = await this.tx
      .select({
        amount: sql<string>`coalesce(sum(${journalPostings.amount}), 0)::text`,
        month: BELGRADE_MONTH,
      })
      .from(journalPostings)
      .innerJoin(
        journalTransactions,
        eq(journalTransactions.id, journalPostings.transactionId),
      )
      .innerJoin(accounts, eq(accounts.id, journalPostings.accountId))
      .innerJoin(categories, eq(categories.id, journalPostings.categoryId))
      .where(
        and(
          eq(journalPostings.categoryId, categoryId),
          eq(journalPostings.currencyCode, currencyCode),
          eq(accounts.classification, "expense"),
          eq(categories.classification, "expense"),
          eq(journalTransactions.status, "posted"),
        ),
      )
      .groupBy(BELGRADE_MONTH)
      .orderBy(asc(BELGRADE_MONTH));

    return rows.map((row) => ({ amount: row.amount, month: row.month }));
  }

  async replacePeriods(periods: BudgetPeriodRecord[]): Promise<void> {
    for (const period of periods) {
      await this.tx
        .insert(budgetPeriods)
        .values({
          ...period,
          month: `${period.month}-01`,
        })
        .onConflictDoUpdate({
          target: [budgetPeriods.categoryId, budgetPeriods.month],
          set: {
            carryInAmount: period.carryInAmount,
            currencyCode: period.currencyCode,
            limitAmount: period.limitAmount,
            recomputedAt: period.recomputedAt,
            remainingAmount: period.remainingAmount,
            spendingAmount: period.spendingAmount,
          },
        });
    }
  }

  async deletePeriodsBefore(categoryId: string, month: string): Promise<void> {
    await this.tx
      .delete(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.categoryId, categoryId),
          lt(budgetPeriods.month, `${month}-01`),
        ),
      );
  }
}

import { and, eq, sql } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import { calculateGoalProgress } from "../domain/goals";
import {
  accounts,
  goals,
  journalPostings,
  journalTransactions,
} from "../db/schema";
import { canonicalDecimal } from "./common";

export async function listGoals(dependencies: ApplicationDependencies) {
  return dependencies.unitOfWork.run(async (tx) => {
    const rows = await tx
      .select({
        accountId: goals.accountId,
        accountName: accounts.name,
        balance: sql<string>`coalesce(sum(case when ${journalTransactions.status} = 'posted' then ${journalPostings.amount} else 0 end), 0)::text`,
        currencyCode: goals.targetCurrencyCode,
        id: goals.id,
        isActive: goals.isActive,
        name: goals.name,
        targetAmount: goals.targetAmount,
      })
      .from(goals)
      .innerJoin(accounts, eq(accounts.id, goals.accountId))
      .leftJoin(journalPostings, eq(journalPostings.accountId, accounts.id))
      .leftJoin(
        journalTransactions,
        and(
          eq(journalTransactions.id, journalPostings.transactionId),
          eq(journalTransactions.status, "posted"),
        ),
      )
      .groupBy(goals.id, accounts.id)
      .orderBy(goals.isActive, goals.name, goals.id);

    return {
      items: rows.map((row) => {
        const progress = calculateGoalProgress({
          balance: row.balance,
          target: row.targetAmount,
        });

        return {
          accountId: row.accountId,
          accountName: row.accountName,
          balance: canonicalDecimal(progress.balance),
          currencyCode: row.currencyCode,
          id: row.id,
          isActive: row.isActive,
          name: row.name,
          percentage: canonicalDecimal(progress.percentage),
          targetAmount: canonicalDecimal(row.targetAmount),
        };
      }),
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

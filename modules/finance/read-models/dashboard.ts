import Decimal from "decimal.js";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import { valueNetWorthEur } from "../application/valuation";
import { budgetMonth } from "../domain/budgets";
import type { EffectiveValuation } from "../domain/valuation";
import {
  accounts,
  journalPostings,
  journalTransactions,
} from "../db/schema";
import { listAccounts } from "./accounts";
import { listBudgets } from "./budgets";
import { canonicalDecimal, valuationKey } from "./common";
import { listGoals } from "./goals";
import { listInvestments } from "./investments";
import { listTransactions } from "./transactions";

export interface DashboardReadModel {
  cashFlow: {
    complete: boolean;
    expenseEur: string | null;
    incomeEur: string | null;
    netEur: string | null;
  };
  netWorth: {
    amount: string | null;
    complete: boolean;
    currencyCode: "EUR";
  };
  totals: {
    assetsEur: string | null;
    liabilitiesEur: string | null;
  };
  budgets: Awaited<ReturnType<typeof listBudgets>>["items"];
  goals: Awaited<ReturnType<typeof listGoals>>["items"];
  portfolio: Awaited<ReturnType<typeof listInvestments>>;
  recentTransactions: Awaited<ReturnType<typeof listTransactions>>["items"];
  valuationSources: EffectiveValuation[];
}

function sumNullable(values: Array<string | null>) {
  if (values.some((value) => value === null)) return null;
  return canonicalDecimal(
    values.reduce(
      (total, value) => total.plus(value ?? "0"),
      new Decimal(0),
    ),
  );
}

export async function getDashboard(
  dependencies: ApplicationDependencies,
  valuationOptions: {
    exchangeRateStaleAfterMs: number;
    marketDataStaleAfterMs: number;
  },
): Promise<DashboardReadModel> {
  const valuation = await valueNetWorthEur(dependencies, valuationOptions);
  const [accountView, budgets, goals, portfolio, transactions, cashFlowRows] =
    await Promise.all([
      listAccounts(dependencies, valuationOptions, valuation),
      listBudgets(dependencies),
      listGoals(dependencies),
      listInvestments(dependencies, valuationOptions, valuation),
      listTransactions(dependencies, { limit: 8 }),
      dependencies.unitOfWork.run(async (tx) => {
        const month = budgetMonth(dependencies.clock.now());
        return tx
          .select({
            currencyCode: journalPostings.currencyCode,
            expenseAmount: sql<string>`coalesce(sum(case when ${accounts.classification} = 'expense' then ${journalPostings.amount} else 0 end), 0)::text`,
            incomeAmount: sql<string>`coalesce(sum(case when ${accounts.classification} = 'income' then -${journalPostings.amount} else 0 end), 0)::text`,
          })
          .from(journalPostings)
          .innerJoin(accounts, eq(accounts.id, journalPostings.accountId))
          .innerJoin(
            journalTransactions,
            eq(journalTransactions.id, journalPostings.transactionId),
          )
          .where(
            and(
              eq(journalTransactions.status, "posted"),
              inArray(accounts.classification, ["income", "expense"]),
              sql`to_char(${journalTransactions.occurredAt} at time zone 'Europe/Belgrade', 'YYYY-MM') = ${month}`,
            ),
          )
          .groupBy(journalPostings.currencyCode);
      }, {
        accessMode: "read only",
        isolationLevel: "repeatable read",
      }),
    ]);
  const rates = new Map<string, EffectiveValuation>();

  for (const account of valuation.accounts) {
    if (account.valuation) rates.set(account.currencyCode, account.valuation);
  }
  for (const position of valuation.investments) {
    rates.set(position.nativeCurrencyCode, position.reportingFx);
  }

  const convert = (field: "expenseAmount" | "incomeAmount") => {
    let total = new Decimal(0);

    for (const row of cashFlowRows) {
      const amount = new Decimal(row[field]);
      if (amount.isZero()) continue;
      if (row.currencyCode === "EUR") {
        total = total.plus(amount);
        continue;
      }
      const rate = rates.get(row.currencyCode);
      if (!rate) return null;
      total = total.plus(amount.times(rate.value));
    }

    return canonicalDecimal(total);
  };
  const incomeEur = convert("incomeAmount");
  const expenseEur = convert("expenseAmount");
  const netEur =
    incomeEur === null || expenseEur === null
      ? null
      : canonicalDecimal(new Decimal(incomeEur).minus(expenseEur));
  const accountAssets = [
    ...accountView.groups.asset,
    ...accountView.groups.receivable,
  ].map((account) => account.eurEstimate);
  const assetsEur = sumNullable([
    ...accountAssets,
    ...portfolio.positions.map((position) => position.marketValueEur),
  ]);
  const liabilitiesEur = sumNullable(
    accountView.groups.liability.map((account) => account.eurEstimate),
  );
  const sources = new Map<string, EffectiveValuation>();

  for (const source of [
    ...valuation.accounts.flatMap((account) =>
      account.valuation ? [account.valuation] : [],
    ),
    ...valuation.investments.flatMap((position) => [
      position.quote,
      position.reportingFx,
    ]),
  ]) {
    sources.set(valuationKey(source), source);
  }

  return {
    budgets: budgets.items,
    cashFlow: {
      complete: netEur !== null,
      expenseEur,
      incomeEur,
      netEur,
    },
    goals: goals.items,
    netWorth: {
      amount: valuation.totalEur,
      complete: valuation.totalEur !== null,
      currencyCode: "EUR",
    },
    portfolio,
    recentTransactions: transactions.items,
    totals: { assetsEur, liabilitiesEur },
    valuationSources: [...sources.values()].sort(
      (left, right) => right.effectiveAt.getTime() - left.effectiveAt.getTime(),
    ),
  };
}

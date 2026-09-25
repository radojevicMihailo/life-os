import { and, desc, eq, inArray } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import { valueNetWorthEur } from "../application/valuation";
import { toDisplayBalance, type AccountClassification } from "../domain/ledger";
import type { EffectiveValuation } from "../domain/valuation";
import {
  accounts,
  journalPostings,
  journalTransactions,
} from "../db/schema";
import { canonicalDecimal, type NetWorthSnapshot } from "./common";

export function displayAccountActivityAmount(input: {
  accountId: string;
  amount: string;
  classification: AccountClassification;
  currencyCode: string;
}) {
  return canonicalDecimal(
    toDisplayBalance(
      {
        classification: input.classification,
        currencyCode: input.currencyCode,
        id: input.accountId,
        minorUnit: 18,
      },
      input.amount,
    ),
  );
}

export interface AccountReadModelItem {
  id: string;
  name: string;
  classification: "asset" | "liability" | "receivable";
  subtype: string;
  currencyCode: string;
  nativeBalance: string;
  eurEstimate: string | null;
  valuation: EffectiveValuation | null;
  isActive: boolean;
  recentActivity: Array<{
    amount: string;
    occurredAt: Date;
    transactionId: string;
    type: string;
  }>;
}

export interface AccountsReadModel {
  complete: boolean;
  groups: {
    asset: AccountReadModelItem[];
    liability: AccountReadModelItem[];
    receivable: AccountReadModelItem[];
  };
}

export async function listAccounts(
  dependencies: ApplicationDependencies,
  valuationOptions: {
    exchangeRateStaleAfterMs: number;
    marketDataStaleAfterMs: number;
  },
  valuationSnapshot?: NetWorthSnapshot,
): Promise<AccountsReadModel> {
  const valuation =
    valuationSnapshot ?? (await valueNetWorthEur(dependencies, valuationOptions));

  return dependencies.unitOfWork.run(async (tx) => {
    const rows = await tx
      .select({
        classification: accounts.classification,
        currencyCode: accounts.currencyCode,
        id: accounts.id,
        isActive: accounts.isActive,
        name: accounts.name,
        subtype: accounts.subtype,
      })
      .from(accounts)
      .where(inArray(accounts.classification, ["asset", "liability", "receivable"]))
      .orderBy(accounts.classification, accounts.name, accounts.id);
    const accountIds = rows.map((row) => row.id);
    const activity = accountIds.length
      ? await tx
          .select({
            accountId: journalPostings.accountId,
            amount: journalPostings.amount,
            classification: accounts.classification,
            currencyCode: accounts.currencyCode,
            occurredAt: journalTransactions.occurredAt,
            transactionId: journalTransactions.id,
            type: journalTransactions.type,
          })
          .from(journalPostings)
          .innerJoin(accounts, eq(accounts.id, journalPostings.accountId))
          .innerJoin(
            journalTransactions,
            eq(journalTransactions.id, journalPostings.transactionId),
          )
          .where(
            and(
              inArray(journalPostings.accountId, accountIds),
              eq(journalTransactions.status, "posted"),
            ),
          )
          .orderBy(
            desc(journalTransactions.occurredAt),
            desc(journalTransactions.id),
          )
          .limit(500)
      : [];
    const valueByAccount = new Map(
      valuation.accounts.map((account) => [account.accountId, account]),
    );

    const groups: AccountsReadModel["groups"] = {
      asset: [],
      liability: [],
      receivable: [],
    };

    for (const row of rows) {
      const classification = row.classification as keyof typeof groups;
      const value = valueByAccount.get(row.id);
      groups[classification].push({
        classification,
        currencyCode: row.currencyCode,
        eurEstimate: value?.eurAmount ?? null,
        id: row.id,
        isActive: row.isActive,
        name: row.name,
        nativeBalance: value?.nativeAmount ?? "0",
        recentActivity: activity
          .filter((item) => item.accountId === row.id)
          .slice(0, 5)
          .map((item) => ({
            amount: displayAccountActivityAmount({
              accountId: item.accountId,
              amount: item.amount,
              classification: item.classification as AccountClassification,
              currencyCode: item.currencyCode,
            }),
            occurredAt: item.occurredAt,
            transactionId: item.transactionId,
            type: item.type,
          })),
        subtype: row.subtype,
        valuation: value?.valuation ?? null,
      });
    }

    return {
      complete: valuation.missingConversions.length === 0,
      groups,
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

import Decimal from "decimal.js";
import {
  and,
  desc,
  eq,
  exists,
  gte,
  inArray,
  lt,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { ApplicationDependencies } from "../application/ports";
import type {
  AccountClassification,
  JournalSource,
  JournalType,
} from "../domain/ledger";
import { toDisplayBalance } from "../domain/ledger";
import {
  accounts,
  categories,
  journalPostings,
  journalTransactions,
} from "../db/schema";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  source?: JournalSource;
  type?: JournalType;
}

export interface TransactionReadModelItem {
  id: string;
  type: JournalType;
  source: JournalSource;
  occurredAt: Date;
  description: string | null;
  corrected: boolean;
  accountNames: string[];
  categoryNames: string[];
  nativeAmounts: Array<{
    accountName: string;
    amount: string;
    currencyCode: string;
  }>;
  correctionDraft: TransactionCorrectionDraft | null;
}

export type TransactionCorrectionDraft =
  | { operation: "expense" | "income"; accountId: string; amount: string; categoryId: string }
  | { operation: "opening_balance"; accountId: string; amount: string }
  | { operation: "transfer"; fromAccountId: string; toAccountId: string; amount: string }
  | { operation: "transfer"; fromAccountId: string; toAccountId: string; fromAmount: string; toAmount: string; effectiveRate: string }
  | { operation: "receivable_out"; fromAccountId: string; receivableAccountId: string; amount: string; counterparty: string }
  | { operation: "receivable_repayment"; receivableAccountId: string; toAccountId: string; amount: string; counterparty: string };

export interface TransactionsReadModel {
  filters: Omit<TransactionFilters, "limit">;
  hasMore: boolean;
  items: TransactionReadModelItem[];
}

function canonical(value: Decimal.Value) {
  return new Decimal(value)
    .toFixed(18)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export function buildNativeAmounts(
  postings: Array<{
    accountClassification: AccountClassification;
    accountName: string;
    amount: string;
    currencyCode: string;
  }>,
) {
  return postings
    .map((posting) => ({
      accountName: posting.accountName,
      amount: canonical(
        toDisplayBalance(
          {
            classification: posting.accountClassification,
            currencyCode: posting.currencyCode,
            id: posting.accountName,
            minorUnit: 18,
          },
          posting.amount,
        ),
      ),
      currencyCode: posting.currencyCode,
    }))
    .sort((left, right) => {
      const amountOrder = new Decimal(left.amount).cmp(right.amount);
      return amountOrder || left.accountName.localeCompare(right.accountName, "sr-Latn");
    });
}

function normalizedLimit(limit: number | undefined) {
  if (limit === undefined) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

type CorrectionPosting = {
  accountClassification: AccountClassification;
  accountId: string;
  accountIsSystem: boolean;
  amount: string;
  categoryId: string | null;
  counterparty: string | null;
  currencyCode: string;
};

function positiveAmount(posting: CorrectionPosting) {
  return canonical(new Decimal(posting.amount).abs());
}

function correctionDraft(type: JournalType, postings: CorrectionPosting[]): TransactionCorrectionDraft | null {
  const user = postings.filter((posting) => !posting.accountIsSystem);
  const categoryId = postings.find((posting) => posting.categoryId)?.categoryId;
  if ((type === "expense" || type === "income") && user[0] && categoryId) {
    return { operation: type, accountId: user[0].accountId, amount: positiveAmount(user[0]), categoryId };
  }
  if (type === "opening_balance" && user[0]) {
    return { operation: type, accountId: user[0].accountId, amount: positiveAmount(user[0]) };
  }
  if (type === "transfer" || type === "foreign_exchange") {
    const from = user.find((posting) => new Decimal(posting.amount).isNegative());
    const to = user.find((posting) => new Decimal(posting.amount).isPositive());
    if (!from || !to) return null;
    if (type === "transfer") {
      return { operation: "transfer", fromAccountId: from.accountId, toAccountId: to.accountId, amount: positiveAmount(from) };
    }
    const fromAmount = positiveAmount(from);
    const toAmount = positiveAmount(to);
    return {
      operation: "transfer",
      fromAccountId: from.accountId,
      toAccountId: to.accountId,
      fromAmount,
      toAmount,
      effectiveRate: canonical(new Decimal(toAmount).div(fromAmount)),
    };
  }
  if (type === "receivable_out") {
    const from = user.find((posting) => posting.accountClassification === "asset" && new Decimal(posting.amount).isNegative());
    const receivable = user.find((posting) => posting.accountClassification === "receivable");
    if (!from || !receivable || !receivable.counterparty) return null;
    return { operation: type, fromAccountId: from.accountId, receivableAccountId: receivable.accountId, amount: positiveAmount(receivable), counterparty: receivable.counterparty };
  }
  if (type === "receivable_repayment") {
    const to = user.find((posting) => posting.accountClassification === "asset" && new Decimal(posting.amount).isPositive());
    const receivable = user.find((posting) => posting.accountClassification === "receivable");
    if (!to || !receivable || !receivable.counterparty) return null;
    return { operation: type, receivableAccountId: receivable.accountId, toAccountId: to.accountId, amount: positiveAmount(receivable), counterparty: receivable.counterparty };
  }
  return null;
}

function selectedFilters(filters: TransactionFilters) {
  const selected: TransactionFilters = { ...filters };
  delete selected.limit;
  return selected as Omit<TransactionFilters, "limit">;
}

export async function listTransactions(
  dependencies: ApplicationDependencies,
  filters: TransactionFilters = {},
): Promise<TransactionsReadModel> {
  return dependencies.unitOfWork.run(async (tx) => {
    const accountFilterPosting = alias(journalPostings, "account_filter_posting");
    const categoryFilterPosting = alias(
      journalPostings,
      "category_filter_posting",
    );
    const limit = normalizedLimit(filters.limit);
    const conditions = [eq(journalTransactions.status, "posted")];

    if (filters.type) conditions.push(eq(journalTransactions.type, filters.type));
    if (filters.source) {
      conditions.push(eq(journalTransactions.source, filters.source));
    }
    if (filters.dateFrom) {
      conditions.push(
        gte(
          sql`${journalTransactions.occurredAt} at time zone 'Europe/Belgrade'`,
          sql`${filters.dateFrom}::date`,
        ),
      );
    }
    if (filters.dateTo) {
      conditions.push(
        lt(
          sql`${journalTransactions.occurredAt} at time zone 'Europe/Belgrade'`,
          sql`${filters.dateTo}::date + interval '1 day'`,
        ),
      );
    }
    if (filters.accountId) {
      conditions.push(
        exists(
          tx
            .select({ value: sql`1` })
            .from(accountFilterPosting)
            .where(
              and(
                eq(
                  accountFilterPosting.transactionId,
                  journalTransactions.id,
                ),
                eq(accountFilterPosting.accountId, filters.accountId),
              ),
            ),
        ),
      );
    }
    if (filters.categoryId) {
      conditions.push(
        exists(
          tx
            .select({ value: sql`1` })
            .from(categoryFilterPosting)
            .where(
              and(
                eq(
                  categoryFilterPosting.transactionId,
                  journalTransactions.id,
                ),
                eq(categoryFilterPosting.categoryId, filters.categoryId),
              ),
            ),
        ),
      );
    }

    const headers = await tx
      .select({
        correctedById: journalTransactions.correctedById,
        correctionOfId: journalTransactions.correctionOfId,
        description: journalTransactions.description,
        id: journalTransactions.id,
        occurredAt: journalTransactions.occurredAt,
        source: journalTransactions.source,
        type: journalTransactions.type,
      })
      .from(journalTransactions)
      .where(and(...conditions))
      .orderBy(desc(journalTransactions.occurredAt), desc(journalTransactions.id))
      .limit(limit + 1);
    const visibleHeaders = headers.slice(0, limit);

    if (visibleHeaders.length === 0) {
      return { filters: selectedFilters(filters), hasMore: false, items: [] };
    }

    const rows = await tx
      .select({
        accountClassification: accounts.classification,
        accountId: accounts.id,
        accountIsSystem: accounts.isSystem,
        accountName: accounts.name,
        amount: journalPostings.amount,
        categoryName: categories.name,
        categoryId: categories.id,
        counterparty: journalPostings.counterparty,
        currencyCode: journalPostings.currencyCode,
        transactionId: journalPostings.transactionId,
      })
      .from(journalPostings)
      .innerJoin(accounts, eq(accounts.id, journalPostings.accountId))
      .leftJoin(categories, eq(categories.id, journalPostings.categoryId))
      .where(
        inArray(
          journalPostings.transactionId,
          visibleHeaders.map((header) => header.id),
        ),
      );
    const rowsByTransaction = new Map<string, typeof rows>();

    for (const row of rows) {
      const grouped = rowsByTransaction.get(row.transactionId) ?? [];
      grouped.push(row);
      rowsByTransaction.set(row.transactionId, grouped);
    }

    const items = visibleHeaders.map((header) => {
      const postings = rowsByTransaction.get(header.id) ?? [];
      const userPostings = postings.filter((posting) => !posting.accountIsSystem);

      return {
        accountNames: [...new Set(userPostings.map((row) => row.accountName))]
          .sort((left, right) => left.localeCompare(right, "sr-Latn")),
        categoryNames: [
          ...new Set(
            postings.flatMap((row) => (row.categoryName ? [row.categoryName] : [])),
          ),
        ].sort((left, right) => left.localeCompare(right, "sr-Latn")),
        corrected: Boolean(header.correctedById || header.correctionOfId),
        correctionDraft: correctionDraft(header.type, postings.map((posting) => ({
          ...posting,
          accountClassification: posting.accountClassification as AccountClassification,
        }))),
        description: header.description,
        id: header.id,
        nativeAmounts: buildNativeAmounts(
          userPostings.map((posting) => ({
            ...posting,
            accountClassification:
              posting.accountClassification as AccountClassification,
          })),
        ),
        occurredAt: header.occurredAt,
        source: header.source,
        type: header.type,
      } satisfies TransactionReadModelItem;
    });
    return {
      filters: selectedFilters(filters),
      hasMore: headers.length > limit,
      items,
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

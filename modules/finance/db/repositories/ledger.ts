import Decimal from "decimal.js";
import { asc, eq, inArray, sql } from "drizzle-orm";

import {
  type AccountClassification,
  type JournalDraft,
  type JournalSource,
  type JournalType,
} from "../../domain/ledger";
import {
  defineCurrency,
  normalizeSignedMoneyAmount,
  type CurrencyDefinition,
} from "../../domain/money";
import { toDisplayBalance } from "../../domain/ledger";
import {
  applicationError,
  type NativeBalance,
  type PersistedPostingSummary,
} from "../../application/ports";
import type { DbTx } from "../client";
import { accounts, currencies, journalPostings, journalTransactions } from "../schema";

export interface PersistedJournal {
  id: string;
  type: JournalType;
  source: JournalSource;
  status: "draft" | "posted" | "reversed";
  occurredAt: Date;
  description: string | null;
  correctionOfId: string | null;
  correctedById: string | null;
  externalReference: string | null;
  postings: Array<{
    account: {
      id: string;
      classification: AccountClassification;
      currencyCode: string;
      minorUnit: number;
      isSystem: boolean;
    };
    amount: string;
    categoryId?: string;
    counterparty?: string;
    currencyCode: string;
    id: string;
  }>;
}

export interface PersistJournalInput extends JournalDraft {
  id: string;
  occurredAt: Date;
  postingIds: string[];
}

function parseCatalogMinorUnit(minorUnit: string): number {
  if (!/^\d+$/.test(minorUnit)) {
    applicationError("currency_minor_unit_invalid");
  }

  const parsed = Number(minorUnit);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 18) {
    applicationError("currency_minor_unit_invalid");
  }

  return parsed;
}

function currencyDefinition(input: {
  currencyCode: string;
  minorUnit: number;
}): CurrencyDefinition {
  return defineCurrency({
    code: input.currencyCode,
    minorUnit: input.minorUnit,
  });
}

function formatMoney(amount: string, currency: CurrencyDefinition) {
  return new Decimal(amount).toFixed(currency.minorUnit);
}

function normalizeOptional(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export class LedgerRepository {
  constructor(private readonly tx: DbTx) {}

  async insertJournal(input: PersistJournalInput): Promise<PersistedPostingSummary[]> {
    await this.tx.insert(journalTransactions).values({
      id: input.id,
      type: input.type,
      occurredAt: input.occurredAt,
      description: input.description ?? null,
      source: input.source,
      status: "posted",
      correctionOfId: input.correctionOfId ?? null,
      correctedById: input.correctedById ?? null,
      externalReference: input.externalReference ?? null,
    });

    const postings = input.postings.map((posting, index) => ({
      id: input.postingIds[index] ?? applicationError("transaction_amount_required"),
      transactionId: input.id,
      accountId: posting.account.id,
      currencyCode: posting.currencyCode,
      amount: posting.amount,
      categoryId: posting.categoryId ?? null,
      counterparty: posting.counterparty ?? null,
    }));

    await this.tx.insert(journalPostings).values(postings);

    return postings.map((posting) => ({
      id: posting.id,
      accountId: posting.accountId,
      currencyCode: posting.currencyCode,
      amount: formatMoney(
        posting.amount,
        currencyDefinition({
          currencyCode: posting.currencyCode,
          minorUnit: input.postings.find(
            (draftPosting) => draftPosting.account.id === posting.accountId,
          )?.account.minorUnit ?? applicationError("currency_minor_unit_invalid"),
        }),
      ),
      ...(posting.categoryId ? { categoryId: posting.categoryId } : {}),
      ...(posting.counterparty ? { counterparty: posting.counterparty } : {}),
    }));
  }

  async lockJournal(id: string): Promise<PersistedJournal> {
    const [header] = await this.tx
      .select()
      .from(journalTransactions)
      .where(eq(journalTransactions.id, id))
      .for("update");

    if (!header) {
      applicationError("journal_not_found");
    }

    const rows = await this.tx
      .select({
        accountClassification: accounts.classification,
        accountCurrencyCode: accounts.currencyCode,
        accountId: accounts.id,
        accountIsSystem: accounts.isSystem,
        accountMinorUnit: currencies.minorUnit,
        amount: journalPostings.amount,
        categoryId: journalPostings.categoryId,
        counterparty: journalPostings.counterparty,
        currencyCode: journalPostings.currencyCode,
        postingId: journalPostings.id,
      })
      .from(journalPostings)
      .innerJoin(accounts, eq(accounts.id, journalPostings.accountId))
      .innerJoin(currencies, eq(currencies.code, accounts.currencyCode))
      .where(eq(journalPostings.transactionId, id))
      .orderBy(asc(journalPostings.id));

    return {
      id: header.id,
      type: header.type,
      source: header.source,
      status: header.status,
      occurredAt: header.occurredAt,
      description: header.description,
      correctionOfId: header.correctionOfId,
      correctedById: header.correctedById,
      externalReference: header.externalReference,
      postings: rows.map((row) => {
        const currency = currencyDefinition({
          currencyCode: row.currencyCode,
          minorUnit: parseCatalogMinorUnit(row.accountMinorUnit),
        });
        const amount = normalizeSignedMoneyAmount(
          formatMoney(row.amount, currency),
          currency,
        );

        return {
          id: row.postingId,
          account: {
            id: row.accountId,
            classification: row.accountClassification as AccountClassification,
            currencyCode: row.accountCurrencyCode,
            minorUnit: parseCatalogMinorUnit(row.accountMinorUnit),
            isSystem: row.accountIsSystem,
          },
          amount,
          currencyCode: row.currencyCode,
          ...(normalizeOptional(row.categoryId)
            ? { categoryId: normalizeOptional(row.categoryId) }
            : {}),
          ...(normalizeOptional(row.counterparty)
            ? { counterparty: normalizeOptional(row.counterparty) }
            : {}),
        };
      }),
    } as PersistedJournal;
  }

  async updateCorrectedBy(originalId: string, correctedById: string): Promise<void> {
    await this.tx
      .update(journalTransactions)
      .set({ correctedById })
      .where(eq(journalTransactions.id, originalId));
  }

  async getNativeBalances(accountIds: string[]): Promise<NativeBalance[]> {
    const uniqueIds = [...new Set(accountIds)].sort();

    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await this.tx
      .select({
        accountId: accounts.id,
        classification: accounts.classification,
        currencyCode: accounts.currencyCode,
        minorUnit: currencies.minorUnit,
        internalBalance: sql<string>`coalesce(sum(${journalPostings.amount}), 0)::text`,
      })
      .from(accounts)
      .innerJoin(currencies, eq(currencies.code, accounts.currencyCode))
      .leftJoin(journalPostings, eq(journalPostings.accountId, accounts.id))
      .where(inArray(accounts.id, uniqueIds))
      .groupBy(
        accounts.id,
        accounts.classification,
        accounts.currencyCode,
        currencies.minorUnit,
      )
      .orderBy(asc(accounts.id));

    return rows.map((row) => {
      const minorUnit = parseCatalogMinorUnit(row.minorUnit);
      const internalBalance = new Decimal(row.internalBalance).toFixed(
        minorUnit,
      );

      return {
        accountId: row.accountId,
        currencyCode: row.currencyCode,
        internalBalance,
        displayBalance: toDisplayBalance(
          {
            id: row.accountId,
            classification: row.classification as AccountClassification,
            currencyCode: row.currencyCode,
            minorUnit,
          },
          internalBalance,
        ),
      };
    });
  }
}

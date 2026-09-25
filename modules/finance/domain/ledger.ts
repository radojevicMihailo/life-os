import Decimal from "decimal.js";

import { DomainError } from "./errors";
import {
  defineCurrency,
  type CurrencyDefinition,
  normalizeSignedMoneyAmount,
  type CurrencyCode,
} from "./money";

export type AccountClassification =
  | "asset"
  | "liability"
  | "receivable"
  | "equity"
  | "income"
  | "expense";

export type JournalType =
  | "income"
  | "expense"
  | "transfer"
  | "foreign_exchange"
  | "opening_balance"
  | "correction"
  | "receivable_out"
  | "receivable_repayment"
  | "investment_trade"
  | "fee";

export type JournalSource = "web" | "shortcut" | "seed" | "system";

export interface LedgerAccount {
  id: string;
  classification: AccountClassification;
  currencyCode: CurrencyCode;
  minorUnit?: number;
}

export interface PostingDraft {
  account: LedgerAccount;
  currencyCode: CurrencyCode;
  amount: string;
  categoryId?: string | null;
  counterparty?: string | null;
}

export interface JournalDraft {
  id?: string;
  type: JournalType;
  source: JournalSource;
  postings: PostingDraft[];
  occurredAt?: Date;
  description?: string | null;
  correctionOfId?: string | null;
  correctedById?: string | null;
  externalReference?: string | null;
}

export interface ReversalMetadata {
  id?: string;
  source: JournalSource;
  occurredAt?: Date;
  description?: string | null;
  externalReference?: string | null;
}

const DEBIT_NORMAL_ACCOUNT_TYPES = new Set<AccountClassification>([
  "asset",
  "expense",
  "receivable",
]);

const CATEGORY_REQUIRED_ACCOUNT_TYPES = new Set<AccountClassification>([
  "income",
  "expense",
]);

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function accountCurrency(account: LedgerAccount): CurrencyCode | CurrencyDefinition {
  if (account.minorUnit === undefined) {
    return account.currencyCode;
  }

  return defineCurrency({
    code: account.currencyCode,
    minorUnit: account.minorUnit,
  });
}

function currencyScale(currency: CurrencyCode | CurrencyDefinition): number {
  if (typeof currency !== "string") {
    return currency.minorUnit;
  }

  return (
    normalizeSignedMoneyAmount("0", currency, {
      allowZero: true,
    }).split(".")[1]?.length ?? 0
  );
}

function negateAmount(amount: string, account: LedgerAccount): string {
  const currency = accountCurrency(account);
  const scale = currencyScale(currency);
  const normalized = normalizeSignedMoneyAmount(amount, currency);

  return new Decimal(normalized).negated().toFixed(scale);
}

function normalizePosting(posting: PostingDraft): PostingDraft {
  if (posting.account.currencyCode !== posting.currencyCode) {
    throw new DomainError("journal_posting_currency_mismatch");
  }

  const amount = normalizeSignedMoneyAmount(
    posting.amount,
    accountCurrency(posting.account),
  );
  const categoryId = normalizeOptionalText(posting.categoryId);
  const counterparty = normalizeOptionalText(posting.counterparty);

  if (
    CATEGORY_REQUIRED_ACCOUNT_TYPES.has(posting.account.classification) &&
    categoryId === undefined
  ) {
    throw new DomainError("journal_category_required");
  }

  if (
    posting.account.classification === "receivable" &&
    counterparty === undefined
  ) {
    throw new DomainError("journal_counterparty_required");
  }

  return {
    ...posting,
    amount,
    categoryId,
    counterparty,
  };
}

function normalizeJournal(draft: JournalDraft): JournalDraft {
  if (draft.postings.length < 2) {
    throw new DomainError("journal_minimum_postings");
  }

  return {
    ...draft,
    postings: draft.postings.map(normalizePosting),
  };
}

export function assertBalanced(draft: JournalDraft): void {
  const normalized = normalizeJournal(draft);
  const sumsByCurrency = new Map<CurrencyCode, Decimal>();

  for (const posting of normalized.postings) {
    sumsByCurrency.set(
      posting.currencyCode,
      (sumsByCurrency.get(posting.currencyCode) ?? new Decimal(0)).plus(
        posting.amount,
      ),
    );
  }

  for (const sum of sumsByCurrency.values()) {
    if (!sum.isZero()) {
      throw new DomainError("journal_unbalanced");
    }
  }
}

export function toDisplayBalance(
  account: LedgerAccount,
  internalAmount: string,
): string {
  const currency = accountCurrency(account);
  const normalized = normalizeSignedMoneyAmount(internalAmount, currency, {
    allowZero: true,
  });
  const scale = currencyScale(currency);
  const decimal = new Decimal(normalized);

  if (DEBIT_NORMAL_ACCOUNT_TYPES.has(account.classification)) {
    return decimal.toFixed(scale);
  }

  return decimal.negated().toFixed(scale);
}

export function reverseJournal(
  original: JournalDraft,
  metadata: ReversalMetadata,
): JournalDraft {
  if (!original.id) {
    throw new DomainError("journal_original_id_required");
  }

  const normalized = normalizeJournal(original);
  assertBalanced(normalized);

  return {
    id: metadata.id,
    type: "correction",
    source: metadata.source,
    occurredAt: metadata.occurredAt ?? original.occurredAt,
    description: metadata.description ?? original.description,
    correctionOfId: original.id,
    externalReference: metadata.externalReference,
    postings: normalized.postings.map((posting) => ({
      ...posting,
      amount: negateAmount(posting.amount, posting.account),
    })),
  };
}

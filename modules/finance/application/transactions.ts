import Decimal from "decimal.js";

import {
  assertBalanced,
  reverseJournal,
  type AccountClassification,
  type JournalDraft,
  type JournalSource,
  type LedgerAccount,
  type PostingDraft,
} from "../domain/ledger";
import {
  defineCurrency,
  Money,
  Rate,
  type CurrencyDefinition,
} from "../domain/money";
import {
  AccountsRepository,
  type AccountRecord,
  type SystemAccountSubtype,
} from "../db/repositories/accounts";
import {
  CategoriesRepository,
  type CategoryRecord,
} from "../db/repositories/categories";
import {
  LedgerRepository,
  type PersistedJournal,
} from "../db/repositories/ledger";
import { InvestmentsRepository } from "../db/repositories/investments";
import type { DbTx } from "../db/client";
import {
  applicationError,
  type ApplicationDependencies,
  type ForeignExchangeSummary,
  type NativeBalance,
  type TransactionSummary,
} from "./ports";
import {
  lockBudgetCategories,
  recomputeBudgetSeriesForDrafts,
} from "./budgets";
import { budgetMonth, isEligibleBudgetExpense } from "../domain/budgets";

type CommonTransactionInput = {
  occurredAt?: Date;
  description?: string | null;
  source?: JournalSource;
  externalReference?: string | null;
};

export type ExpenseTransactionInput = CommonTransactionInput & {
  type: "expense";
  accountId: string;
  categoryId: string;
  amount: string;
};

export type IncomeTransactionInput = CommonTransactionInput & {
  type: "income";
  accountId: string;
  categoryId: string;
  amount: string;
};

export type TransferTransactionInput = CommonTransactionInput & {
  type: "transfer";
  fromAccountId: string;
  toAccountId: string;
  amount?: string;
  fromAmount?: string;
  toAmount?: string;
  effectiveRate?: string;
  fee?: {
    amount: string;
    categoryId: string;
  };
};

export type OpeningBalanceTransactionInput = CommonTransactionInput & {
  type: "opening_balance";
  accountId: string;
  amount: string;
};

export type ReceivableOutTransactionInput = CommonTransactionInput & {
  type: "receivable_out";
  fromAccountId: string;
  receivableAccountId: string;
  amount: string;
  counterparty?: string | null;
};

export type ReceivableRepaymentTransactionInput = CommonTransactionInput & {
  type: "receivable_repayment";
  receivableAccountId: string;
  toAccountId: string;
  amount: string;
  counterparty?: string | null;
};

export type RecordTransactionInput =
  | ExpenseTransactionInput
  | IncomeTransactionInput
  | OpeningBalanceTransactionInput
  | ReceivableOutTransactionInput
  | ReceivableRepaymentTransactionInput
  | TransferTransactionInput;

export interface CorrectTransactionInput {
  originalId: string;
  replacement: RecordTransactionInput;
  occurredAt?: Date;
  source?: JournalSource;
  description?: string | null;
  externalReference?: string | null;
}

export interface CorrectionSummary {
  originalId: string;
  reversal: TransactionSummary;
  replacement: TransactionSummary;
  affectedBalances: NativeBalance[];
}

export interface GetNativeBalancesInput {
  accountIds: string[];
}

export type TransactionBuild = {
  draft: JournalDraft;
  userAccountIds: string[];
  foreignExchange?: ForeignExchangeSummary;
};

function budgetCategoryIds(input: RecordTransactionInput) {
  switch (input.type) {
    case "expense":
      return [input.categoryId];
    case "transfer":
      return input.fee ? [input.fee.categoryId] : [];
    default:
      return [];
  }
}

function budgetCategoryIdsFromDraft(draft: JournalDraft) {
  return draft.postings.flatMap((posting) =>
    isEligibleBudgetExpense({
      accountClassification: posting.account.classification,
      categoryId: posting.categoryId,
    }) && posting.categoryId
      ? [posting.categoryId]
      : [],
  );
}

const DEBIT_NORMAL_CLASSIFICATIONS = new Set<AccountClassification>([
  "asset",
  "expense",
  "receivable",
]);

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function accountCurrency(account: Pick<AccountRecord, "currencyCode" | "minorUnit">) {
  return defineCurrency({
    code: account.currencyCode,
    minorUnit: account.minorUnit,
  });
}

function money(value: string, currency: CurrencyDefinition) {
  return Money.parse(value, currency).amount;
}

function rate(value: string) {
  return Rate.parse(value).value;
}

function negate(amount: string, currency: CurrencyDefinition) {
  return new Decimal(amount).negated().toFixed(currency.minorUnit);
}

function addAmounts(currency: CurrencyDefinition, ...amounts: string[]) {
  return amounts
    .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
    .toFixed(currency.minorUnit);
}

function multiplyAmount(
  amount: string,
  rateValue: string,
  currency: CurrencyDefinition,
) {
  return new Decimal(amount)
    .times(rateValue)
    .toFixed(currency.minorUnit);
}

function divideAmounts(numerator: string, denominator: string) {
  return new Decimal(numerator).div(denominator).toFixed(18);
}

function accountToLedger(account: AccountRecord): LedgerAccount {
  return {
    id: account.id,
    classification: account.classification,
    currencyCode: account.currencyCode,
    minorUnit: account.minorUnit,
  };
}

function posting(
  account: AccountRecord,
  amount: string,
  dimensions?: {
    categoryId?: string;
    counterparty?: string;
  },
): PostingDraft {
  return {
    account: accountToLedger(account),
    currencyCode: account.currencyCode,
    amount,
    ...(dimensions?.categoryId ? { categoryId: dimensions.categoryId } : {}),
    ...(dimensions?.counterparty
      ? { counterparty: dimensions.counterparty }
      : {}),
  };
}

function assertActiveAccount(account: AccountRecord | undefined) {
  if (!account) {
    applicationError("account_not_found");
  }

  if (!account.isActive) {
    applicationError("account_inactive");
  }

  return account;
}

function assertActiveCategory(category: CategoryRecord | undefined) {
  if (!category) {
    applicationError("category_not_found");
  }

  if (!category.isActive) {
    applicationError("category_inactive");
  }

  return category;
}

function requireAccountClassification(
  account: AccountRecord,
  classifications: AccountClassification[],
) {
  if (!classifications.includes(account.classification)) {
    applicationError("transaction_account_classification_mismatch");
  }
}

function requireCategoryClassification(
  category: CategoryRecord,
  classification: "income" | "expense",
) {
  if (category.classification !== classification) {
    applicationError("category_classification_mismatch");
  }
}

function affectedBudgetPeriods(
  draft: JournalDraft,
): TransactionSummary["affectedBudgetPeriods"] {
  const occurredAt = draft.occurredAt ?? new Date();
  const month = `${budgetMonth(occurredAt)}-01`;
  const periods = new Map<string, TransactionSummary["affectedBudgetPeriods"][number]>();

  for (const postingDraft of draft.postings) {
    const categoryId = postingDraft.categoryId;
    if (!categoryId || !isEligibleBudgetExpense({
      accountClassification: postingDraft.account.classification,
      categoryId,
    })) {
      continue;
    }

    const key = `${categoryId}:${postingDraft.currencyCode}:${month}`;
    periods.set(key, {
      categoryId,
      currencyCode: postingDraft.currencyCode,
      month,
    });
  }

  return [...periods.values()].sort((a, b) =>
    `${a.categoryId}:${a.currencyCode}`.localeCompare(
      `${b.categoryId}:${b.currencyCode}`,
    ),
  );
}

async function lockAccountMap(
  repository: AccountsRepository,
  accountIds: string[],
) {
  const rows = await repository.lockByIds(accountIds);
  const map = new Map(rows.map((account) => [account.id, account]));

  for (const id of new Set(accountIds)) {
    assertActiveAccount(map.get(id));
  }

  return map;
}

async function lockCategoryMap(
  repository: CategoriesRepository,
  categoryIds: string[],
) {
  const rows = await repository.lockByIds(categoryIds);
  const map = new Map(rows.map((category) => [category.id, category]));

  for (const id of new Set(categoryIds)) {
    assertActiveCategory(map.get(id));
  }

  return map;
}

function commonDraftFields(
  input: CommonTransactionInput,
  fallback: {
    occurredAt: Date;
    source: JournalSource;
  },
) {
  return {
    occurredAt: input.occurredAt ?? fallback.occurredAt,
    description: normalizeOptionalText(input.description),
    externalReference: normalizeOptionalText(input.externalReference),
    source: input.source ?? fallback.source,
  };
}

async function systemAccount(
  repository: AccountsRepository,
  input: {
    classification: AccountClassification;
    currencyCode: string;
    minorUnit?: number;
    now: Date;
    subtype: SystemAccountSubtype;
  },
) {
  const account = await repository.getOrCreateSystemAccount(input);

  if (!account.isActive) {
    applicationError("account_inactive");
  }

  return account;
}

async function systemAccounts<Role extends string>(
  repository: AccountsRepository,
  requests: Array<{
    role: Role;
    classification: AccountClassification;
    currencyCode: string;
    minorUnit?: number;
    now: Date;
    subtype: SystemAccountSubtype;
  }>,
) {
  const accountsByRole = await repository.getOrCreateSystemAccounts(requests);

  for (const account of accountsByRole.values()) {
    if (!account.isActive) {
      applicationError("account_inactive");
    }
  }

  return accountsByRole;
}

async function buildIncome(
  input: IncomeTransactionInput,
  repositories: {
    accounts: AccountsRepository;
    categories: CategoriesRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  const accountMap = await lockAccountMap(repositories.accounts, [
    input.accountId,
  ]);
  const categoryMap = await lockCategoryMap(repositories.categories, [
    input.categoryId,
  ]);
  const account = accountMap.get(input.accountId) ?? applicationError("account_not_found");
  const category = categoryMap.get(input.categoryId) ?? applicationError("category_not_found");
  requireAccountClassification(account, ["asset"]);
  requireCategoryClassification(category, "income");

  const amount = money(input.amount, accountCurrency(account));
  const income = await systemAccount(repositories.accounts, {
    classification: "income",
    currencyCode: account.currencyCode,
    minorUnit: account.minorUnit,
    now: fallback.now,
    subtype: "income",
  });
  const draft: JournalDraft = {
    ...commonDraftFields(input, {
      occurredAt: fallback.now,
      source: fallback.source,
    }),
    type: "income",
    postings: [
      posting(account, amount),
      posting(income, negate(amount, accountCurrency(income)), {
        categoryId: category.id,
      }),
    ],
  };

  return { draft, userAccountIds: [account.id] };
}

async function buildExpense(
  input: ExpenseTransactionInput,
  repositories: {
    accounts: AccountsRepository;
    categories: CategoriesRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  const accountMap = await lockAccountMap(repositories.accounts, [
    input.accountId,
  ]);
  const categoryMap = await lockCategoryMap(repositories.categories, [
    input.categoryId,
  ]);
  const account = accountMap.get(input.accountId) ?? applicationError("account_not_found");
  const category = categoryMap.get(input.categoryId) ?? applicationError("category_not_found");
  requireAccountClassification(account, ["asset", "liability"]);
  requireCategoryClassification(category, "expense");

  const amount = money(input.amount, accountCurrency(account));
  const expense = await systemAccount(repositories.accounts, {
    classification: "expense",
    currencyCode: account.currencyCode,
    minorUnit: account.minorUnit,
    now: fallback.now,
    subtype: "expense",
  });
  const draft: JournalDraft = {
    ...commonDraftFields(input, {
      occurredAt: fallback.now,
      source: fallback.source,
    }),
    type: "expense",
    postings: [
      posting(expense, amount, { categoryId: category.id }),
      posting(account, negate(amount, accountCurrency(account))),
    ],
  };

  return { draft, userAccountIds: [account.id] };
}

function signedOpeningAmount(account: AccountRecord, amount: string) {
  const currency = accountCurrency(account);
  const normalized = money(amount, currency);

  return DEBIT_NORMAL_CLASSIFICATIONS.has(account.classification)
    ? normalized
    : negate(normalized, currency);
}

async function buildOpeningBalance(
  input: OpeningBalanceTransactionInput,
  repositories: {
    accounts: AccountsRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  const accountMap = await lockAccountMap(repositories.accounts, [
    input.accountId,
  ]);
  const account = accountMap.get(input.accountId) ?? applicationError("account_not_found");
  requireAccountClassification(account, ["asset", "liability", "receivable"]);

  const amount = signedOpeningAmount(account, input.amount);
  const equity = await systemAccount(repositories.accounts, {
    classification: "equity",
    currencyCode: account.currencyCode,
    minorUnit: account.minorUnit,
    now: fallback.now,
    subtype: "opening_balance",
  });
  const draft: JournalDraft = {
    ...commonDraftFields(input, {
      occurredAt: fallback.now,
      source: fallback.source,
    }),
    type: "opening_balance",
    postings: [
      posting(account, amount),
      posting(equity, negate(amount, accountCurrency(equity))),
    ],
  };

  return { draft, userAccountIds: [account.id] };
}

function transferAmounts(input: TransferTransactionInput, from: AccountRecord) {
  if (from.currencyCode === undefined) {
    applicationError("account_not_found");
  }

  if (input.amount && (input.fromAmount || input.toAmount || input.effectiveRate)) {
    applicationError("transaction_fx_rate_amount_conflict");
  }

  if (input.amount) {
    const amount = money(input.amount, accountCurrency(from));
    return { fromAmount: amount, toAmount: amount };
  }

  if (!input.fromAmount) {
    applicationError("transaction_amount_required");
  }

  return { fromAmount: money(input.fromAmount, accountCurrency(from)) };
}

async function buildTransfer(
  input: TransferTransactionInput,
  repositories: {
    accounts: AccountsRepository;
    categories: CategoriesRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  const accountMap = await lockAccountMap(repositories.accounts, [
    input.fromAccountId,
    input.toAccountId,
  ]);
  const from = accountMap.get(input.fromAccountId) ?? applicationError("account_not_found");
  const to = accountMap.get(input.toAccountId) ?? applicationError("account_not_found");
  requireAccountClassification(from, ["asset", "liability"]);
  requireAccountClassification(to, ["asset", "liability"]);

  const categoryIds = input.fee ? [input.fee.categoryId] : [];
  const categoryMap = await lockCategoryMap(repositories.categories, categoryIds);
  const feeCategory = input.fee
    ? categoryMap.get(input.fee.categoryId) ??
      applicationError("category_not_found")
    : undefined;

  if (feeCategory) {
    requireCategoryClassification(feeCategory, "expense");
  }

  const amounts = transferAmounts(input, from);
  const sameCurrency = from.currencyCode === to.currencyCode;
  const fromCurrency = accountCurrency(from);
  const toCurrency = accountCurrency(to);
  const feeAmount = input.fee ? money(input.fee.amount, fromCurrency) : undefined;
  const baseFields = commonDraftFields(input, {
    occurredAt: fallback.now,
    source: fallback.source,
  });

  if (sameCurrency) {
    const toAmount = amounts.toAmount ?? amounts.fromAmount;
    const postings = [
      posting(from, negate(
        feeAmount
          ? addAmounts(fromCurrency, amounts.fromAmount, feeAmount)
          : amounts.fromAmount,
        fromCurrency,
      )),
      posting(to, toAmount),
    ];

    if (feeAmount && feeCategory) {
      const fees = await systemAccount(repositories.accounts, {
        classification: "expense",
        currencyCode: from.currencyCode,
        minorUnit: from.minorUnit,
        now: fallback.now,
        subtype: "fees",
      });
      postings.push(
        posting(fees, feeAmount, {
          categoryId: feeCategory.id,
        }),
      );
    }

    return {
      draft: {
        ...baseFields,
        type: "transfer",
        postings,
      },
      userAccountIds: [from.id, to.id],
    };
  }

  if (input.toAmount && input.effectiveRate) {
    applicationError("transaction_fx_rate_amount_conflict");
  }

  const normalizedRate = input.effectiveRate
    ? rate(input.effectiveRate)
    : undefined;
  const toAmount = input.toAmount
    ? money(input.toAmount, toCurrency)
    : normalizedRate
      ? multiplyAmount(amounts.fromAmount, normalizedRate, toCurrency)
      : applicationError("transaction_fx_amount_required");
  const effectiveRate = normalizedRate ?? divideAmounts(toAmount, amounts.fromAmount);
  const fxAccounts = await systemAccounts(repositories.accounts, [
    {
      role: "fromFx",
      classification: "equity",
      currencyCode: from.currencyCode,
      minorUnit: from.minorUnit,
      now: fallback.now,
      subtype: "foreign_exchange",
    },
    {
      role: "toFx",
      classification: "equity",
      currencyCode: to.currencyCode,
      minorUnit: to.minorUnit,
      now: fallback.now,
      subtype: "foreign_exchange",
    },
  ]);
  const fromFx = fxAccounts.get("fromFx") ??
    applicationError("account_not_found");
  const toFx = fxAccounts.get("toFx") ?? applicationError("account_not_found");
  const postings = [
    posting(from, negate(
      feeAmount
        ? addAmounts(fromCurrency, amounts.fromAmount, feeAmount)
        : amounts.fromAmount,
      fromCurrency,
    )),
    posting(fromFx, amounts.fromAmount),
    posting(to, toAmount),
    posting(toFx, negate(toAmount, accountCurrency(toFx))),
  ];

  if (feeAmount && feeCategory) {
    const fees = await systemAccount(repositories.accounts, {
      classification: "expense",
      currencyCode: from.currencyCode,
      minorUnit: from.minorUnit,
      now: fallback.now,
      subtype: "fees",
    });
    postings.push(posting(fees, feeAmount, { categoryId: feeCategory.id }));
  }

  return {
    draft: {
      ...baseFields,
      type: "foreign_exchange",
      postings,
    },
    userAccountIds: [from.id, to.id],
    foreignExchange: {
      effectiveRate,
      fromAmount: amounts.fromAmount,
      fromCurrencyCode: from.currencyCode,
      toAmount,
      toCurrencyCode: to.currencyCode,
    },
  };
}

async function buildReceivableOut(
  input: ReceivableOutTransactionInput,
  repositories: {
    accounts: AccountsRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  const accountMap = await lockAccountMap(repositories.accounts, [
    input.fromAccountId,
    input.receivableAccountId,
  ]);
  const from = accountMap.get(input.fromAccountId) ?? applicationError("account_not_found");
  const receivable = accountMap.get(input.receivableAccountId) ??
    applicationError("account_not_found");
  requireAccountClassification(from, ["asset"]);
  requireAccountClassification(receivable, ["receivable"]);

  const amount = money(input.amount, accountCurrency(from));
  const counterparty = normalizeOptionalText(input.counterparty);
  const draft: JournalDraft = {
    ...commonDraftFields(input, {
      occurredAt: fallback.now,
      source: fallback.source,
    }),
    type: "receivable_out",
    postings: [
      posting(receivable, amount, { counterparty }),
      posting(from, negate(amount, accountCurrency(from))),
    ],
  };

  return { draft, userAccountIds: [from.id, receivable.id] };
}

async function buildReceivableRepayment(
  input: ReceivableRepaymentTransactionInput,
  repositories: {
    accounts: AccountsRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  const accountMap = await lockAccountMap(repositories.accounts, [
    input.receivableAccountId,
    input.toAccountId,
  ]);
  const receivable = accountMap.get(input.receivableAccountId) ??
    applicationError("account_not_found");
  const to = accountMap.get(input.toAccountId) ?? applicationError("account_not_found");
  requireAccountClassification(receivable, ["receivable"]);
  requireAccountClassification(to, ["asset"]);

  const amount = money(input.amount, accountCurrency(to));
  const counterparty = normalizeOptionalText(input.counterparty);
  const draft: JournalDraft = {
    ...commonDraftFields(input, {
      occurredAt: fallback.now,
      source: fallback.source,
    }),
    type: "receivable_repayment",
    postings: [
      posting(to, amount),
      posting(receivable, negate(amount, accountCurrency(receivable)), {
        counterparty,
      }),
    ],
  };

  return { draft, userAccountIds: [to.id, receivable.id] };
}

async function buildRecordTransaction(
  input: RecordTransactionInput,
  repositories: {
    accounts: AccountsRepository;
    categories: CategoriesRepository;
  },
  fallback: { now: Date; source: JournalSource },
): Promise<TransactionBuild> {
  switch (input.type) {
    case "expense":
      return buildExpense(input, repositories, fallback);
    case "income":
      return buildIncome(input, repositories, fallback);
    case "opening_balance":
      return buildOpeningBalance(input, repositories, fallback);
    case "receivable_out":
      return buildReceivableOut(input, repositories, fallback);
    case "receivable_repayment":
      return buildReceivableRepayment(input, repositories, fallback);
    case "transfer":
      return buildTransfer(input, repositories, fallback);
  }
}

function transactionSummary(input: {
  affectedBalances: NativeBalance[];
  correctionOfId?: string | null;
  correctedById?: string | null;
  draft: JournalDraft;
  foreignExchange?: ForeignExchangeSummary;
  id: string;
  postings: TransactionSummary["postings"];
}): TransactionSummary {
  return {
    id: input.id,
    type: input.draft.type,
    source: input.draft.source,
    occurredAt: input.draft.occurredAt ?? new Date(),
    ...(input.draft.description ? { description: input.draft.description } : {}),
    ...(input.correctionOfId ? { correctionOfId: input.correctionOfId } : {}),
    ...(input.correctedById ? { correctedById: input.correctedById } : {}),
    ...(input.draft.externalReference
      ? { externalReference: input.draft.externalReference }
      : {}),
    postings: input.postings,
    affectedBalances: input.affectedBalances,
    ...(input.foreignExchange ? { foreignExchange: input.foreignExchange } : {}),
    affectedBudgetPeriods: affectedBudgetPeriods(input.draft),
  };
}

export async function persistTransactionBuild(
  deps: ApplicationDependencies,
  ledger: LedgerRepository,
  build: TransactionBuild,
  options?: {
    correctionOfId?: string;
    id?: string;
  },
): Promise<TransactionSummary> {
  const draft = {
    ...build.draft,
    id: options?.id ?? deps.ids.nextId("journalTransaction"),
    correctionOfId: options?.correctionOfId ?? build.draft.correctionOfId,
  };

  assertBalanced(draft);

  const postings = await ledger.insertJournal({
    ...draft,
    id: draft.id,
    occurredAt: draft.occurredAt ?? deps.clock.now(),
    postingIds: draft.postings.map(() => deps.ids.nextId("journalPosting")),
  });
  const balances = await ledger.getNativeBalances(build.userAccountIds);

  return transactionSummary({
    affectedBalances: balances,
    correctionOfId: draft.correctionOfId,
    correctedById: draft.correctedById,
    draft,
    foreignExchange: build.foreignExchange,
    id: draft.id,
    postings,
  });
}

export async function recordTransaction(
  deps: ApplicationDependencies,
  input: RecordTransactionInput,
): Promise<TransactionSummary> {
  return deps.unitOfWork.run(async (tx: DbTx) => {
    const repositories = {
      accounts: new AccountsRepository(tx),
      categories: new CategoriesRepository(tx),
    };
    const ledger = new LedgerRepository(tx);
    const now = deps.clock.now();
    await lockBudgetCategories(tx, budgetCategoryIds(input));
    const build = await buildRecordTransaction(input, repositories, {
      now,
      source: input.source ?? "web",
    });

    const summary = await persistTransactionBuild(deps, ledger, build);
    await recomputeBudgetSeriesForDrafts(deps, tx, [build.draft]);
    return summary;
  });
}

function journalDraftFromPersisted(journal: PersistedJournal): JournalDraft {
  return {
    id: journal.id,
    type: journal.type,
    source: journal.source,
    occurredAt: journal.occurredAt,
    description: journal.description,
    correctionOfId: journal.correctionOfId,
    correctedById: journal.correctedById,
    externalReference: journal.externalReference,
    postings: journal.postings.map((journalPosting) => ({
      account: {
        id: journalPosting.account.id,
        classification: journalPosting.account.classification,
        currencyCode: journalPosting.account.currencyCode,
        minorUnit: journalPosting.account.minorUnit,
      },
      currencyCode: journalPosting.currencyCode,
      amount: journalPosting.amount,
      ...(journalPosting.categoryId
        ? { categoryId: journalPosting.categoryId }
        : {}),
      ...(journalPosting.counterparty
        ? { counterparty: journalPosting.counterparty }
        : {}),
    })),
  };
}

export async function correctTransaction(
  deps: ApplicationDependencies,
  input: CorrectTransactionInput,
): Promise<CorrectionSummary> {
  return deps.unitOfWork.run(async (tx: DbTx) => {
    const repositories = {
      accounts: new AccountsRepository(tx),
      categories: new CategoriesRepository(tx),
    };
    const ledger = new LedgerRepository(tx);
    const now = deps.clock.now();
    const original = await ledger.lockJournal(input.originalId);

    if (await new InvestmentsRepository(tx).hasJournalLink(original.id)) {
      applicationError("investment_journal_correction_unsupported");
    }

    if (original.type === "correction" || original.correctionOfId) {
      applicationError("journal_reversal_cannot_be_corrected");
    }

    if (original.correctedById) {
      applicationError("journal_already_corrected");
    }

    const reversalDraft = reverseJournal(journalDraftFromPersisted(original), {
      id: deps.ids.nextId("journalTransaction"),
      source: input.source ?? "web",
      occurredAt: input.occurredAt ?? now,
      description:
        normalizeOptionalText(input.description) ??
        `Reversal of ${original.id}`,
      externalReference: normalizeOptionalText(input.externalReference),
    });
    await lockBudgetCategories(tx, [
      ...budgetCategoryIdsFromDraft(reversalDraft),
      ...budgetCategoryIds(input.replacement),
    ]);
    const originalUserAccountIds = original.postings
      .filter((journalPosting) => !journalPosting.account.isSystem)
      .map((journalPosting) => journalPosting.account.id);
    const reversalSummary = await persistTransactionBuild(
      deps,
      ledger,
      {
        draft: reversalDraft,
        userAccountIds: originalUserAccountIds,
      },
      {
        id: reversalDraft.id,
      },
    );
    const replacementBuild = await buildRecordTransaction(
      {
        ...input.replacement,
        occurredAt: input.replacement.occurredAt ?? input.occurredAt ?? now,
        source: input.replacement.source ?? input.source ?? "web",
      },
      repositories,
      {
        now,
        source: input.source ?? "web",
      },
    );
    const replacementSummary = await persistTransactionBuild(
      deps,
      ledger,
      replacementBuild,
      {
        correctionOfId: original.id,
      },
    );

    await ledger.updateCorrectedBy(original.id, replacementSummary.id);
    await recomputeBudgetSeriesForDrafts(deps, tx, [
      reversalDraft,
      replacementBuild.draft,
    ]);

    const affectedBalances = await ledger.getNativeBalances([
      ...new Set([
        ...originalUserAccountIds,
        ...replacementBuild.userAccountIds,
      ]),
    ]);

    return {
      originalId: original.id,
      reversal: reversalSummary,
      replacement: replacementSummary,
      affectedBalances,
    };
  });
}

export async function getNativeBalances(
  deps: ApplicationDependencies,
  input: GetNativeBalancesInput,
): Promise<NativeBalance[]> {
  return deps.unitOfWork.run(async (tx) => {
    const ledger = new LedgerRepository(tx);
    return ledger.getNativeBalances(input.accountIds);
  });
}

import type {
  AccountClassification,
  JournalSource,
  JournalType,
} from "../domain/ledger";
import type { UnitOfWork } from "../db/unit-of-work";

export type IdKind =
  | "account"
  | "budgetLimit"
  | "budgetPeriod"
  | "category"
  | "goal"
  | "instrument"
  | "investmentAccount"
  | "idempotencyRecord"
  | "investmentTransaction"
  | "journalPosting"
  | "journalTransaction"
  | "lotDisposal"
  | "exchangeRate"
  | "manualOverride"
  | "marketQuote"
  | "providerRefreshRun"
  | "taxLot";

export interface IdGenerator {
  nextId(kind: IdKind): string;
}

export interface Clock {
  now(): Date;
}

export interface ApplicationDependencies {
  unitOfWork: UnitOfWork;
  ids: IdGenerator;
  clock: Clock;
}

export type ApplicationErrorCode =
  | "account_classification_unsupported"
  | "account_has_active_goals"
  | "account_inactive"
  | "account_not_found"
  | "account_system_archive_forbidden"
  | "budget_currency_mismatch"
  | "budget_month_invalid"
  | "category_classification_mismatch"
  | "category_inactive"
  | "category_not_found"
  | "category_system_archive_forbidden"
  | "currency_invalid"
  | "currency_minor_unit_invalid"
  | "currency_not_found"
  | "goal_account_must_be_asset"
  | "goal_currency_mismatch"
  | "goal_name_required"
  | "goal_not_found"
  | "instrument_inactive"
  | "instrument_not_found"
  | "investment_account_inactive"
  | "investment_account_not_found"
  | "investment_asset_class_unsupported"
  | "investment_backfill_after_disposal"
  | "investment_backdated_sale_after_disposal"
  | "investment_cash_currency_mismatch"
  | "investment_eur_fx_rate_not_identity"
  | "investment_journal_correction_unsupported"
  | "investment_reporting_currency_unsupported"
  | "investment_trade_currency_mismatch"
  | "investment_provider_mismatch"
  | "investment_provider_resolution_failed"
  | "journal_already_corrected"
  | "journal_not_found"
  | "journal_reversal_cannot_be_corrected"
  | "transaction_account_classification_mismatch"
  | "transaction_amount_required"
  | "transaction_fx_amount_required"
  | "transaction_fx_rate_amount_conflict";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode) {
    super(code);
    this.name = "ApplicationError";
    this.code = code;
  }
}

export function applicationError(code: ApplicationErrorCode): never {
  throw new ApplicationError(code);
}

export interface AccountSummary {
  id: string;
  name: string;
  classification: AccountClassification;
  subtype: string;
  currencyCode: string;
  minorUnit: number;
  isSystem: boolean;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategorySummary {
  id: string;
  name: string;
  classification: "income" | "expense";
  isSystem: boolean;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NativeBalance {
  accountId: string;
  currencyCode: string;
  internalBalance: string;
  displayBalance: string;
}

export interface PersistedPostingSummary {
  id: string;
  accountId: string;
  currencyCode: string;
  amount: string;
  categoryId?: string;
  counterparty?: string;
}

export interface ForeignExchangeSummary {
  fromAmount: string;
  fromCurrencyCode: string;
  toAmount: string;
  toCurrencyCode: string;
  effectiveRate: string;
}

export interface TransactionSummary {
  id: string;
  type: JournalType;
  source: JournalSource;
  occurredAt: Date;
  description?: string;
  correctionOfId?: string;
  correctedById?: string;
  externalReference?: string;
  postings: PersistedPostingSummary[];
  affectedBalances: NativeBalance[];
  foreignExchange?: ForeignExchangeSummary;
  affectedBudgetPeriods: Array<{
    categoryId: string;
    month: string;
    currencyCode: string;
  }>;
}

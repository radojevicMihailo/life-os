export const domainErrorCodes = [
  "journal_category_required",
  "journal_counterparty_required",
  "journal_minimum_postings",
  "journal_original_id_required",
  "journal_posting_currency_mismatch",
  "journal_posting_zero_amount",
  "journal_unbalanced",
  "investment_asset_class_unsupported",
  "investment_fee_exceeds_amount",
  "investment_quantity_insufficient",
  "money_amount_overflow",
  "money_currency_mismatch",
  "money_currency_unsupported",
  "money_invalid_decimal",
  "money_non_positive",
  "money_precision_exceeded",
  "quantity_invalid_decimal",
  "quantity_non_positive",
  "quantity_precision_exceeded",
  "rate_invalid_decimal",
  "rate_non_positive",
  "rate_precision_exceeded",
] as const;

export type DomainErrorCode = (typeof domainErrorCodes)[number];

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode) {
    super(code);
    this.name = "DomainError";
    this.code = code;
  }
}

export function isDomainError(
  error: unknown,
  code?: DomainErrorCode,
): error is DomainError {
  if (!(error instanceof DomainError)) {
    return false;
  }

  return code === undefined ? true : error.code === code;
}

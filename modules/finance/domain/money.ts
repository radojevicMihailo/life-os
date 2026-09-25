import Decimal from "decimal.js";

import { DomainError, type DomainErrorCode } from "./errors";

export const currencyMinorUnits = {
  RSD: 2,
  EUR: 2,
  USD: 2,
  HUF: 2,
} as const;

export type BuiltInCurrencyCode = keyof typeof currencyMinorUnits;
export type CurrencyCode = string;

export interface CurrencyDefinition {
  code: CurrencyCode;
  minorUnit: number;
}

export type MoneyCurrency = CurrencyCode | CurrencyDefinition;

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_UP,
});

const STRICT_DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const MONEY_MAX_INTEGER_DIGITS = 20;
const RATE_MAX_INTEGER_DIGITS = 20;
const QUANTITY_MAX_INTEGER_DIGITS = 24;
const MAX_MONEY_MINOR_UNIT = 18;

type NormalizeOptions = {
  scale: number;
  fixedScale: boolean;
  signed: boolean;
  maxIntegerDigits?: number;
  allowZero?: boolean;
  invalidCode: DomainErrorCode;
  precisionCode: DomainErrorCode;
  overflowCode?: DomainErrorCode;
  nonPositiveCode?: DomainErrorCode;
  zeroCode?: DomainErrorCode;
};

type DecimalLexeme = {
  sign: string;
  integerDigits: string;
  fractionalDigits: string;
};

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/\.?0+$/, "");
}

function parseDecimalLexeme(
  value: string,
  invalidCode: DomainErrorCode,
): DecimalLexeme {
  if (value.trim() !== value) {
    throw new DomainError(invalidCode);
  }

  const match = STRICT_DECIMAL_PATTERN.exec(value);

  if (!match) {
    throw new DomainError(invalidCode);
  }

  return {
    sign: match[1] ?? "",
    integerDigits: match[2] ?? "0",
    fractionalDigits: match[3] ?? "",
  };
}

function countCanonicalIntegerDigits(value: string): number {
  const canonical = value.replace(/^0+(?=\d)/, "");
  return canonical.length;
}

function normalizeCurrencyCode(
  currencyCode: string,
  unsupportedCode: DomainErrorCode,
): CurrencyCode {
  const normalized = currencyCode.trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  throw new DomainError(unsupportedCode);
}

export function defineCurrency(input: {
  code: string;
  minorUnit: number;
}): CurrencyDefinition {
  const code = normalizeCurrencyCode(input.code, "money_currency_unsupported");

  if (
    !Number.isInteger(input.minorUnit) ||
    input.minorUnit < 0 ||
    input.minorUnit > MAX_MONEY_MINOR_UNIT
  ) {
    throw new DomainError("money_currency_unsupported");
  }

  return {
    code,
    minorUnit: input.minorUnit,
  };
}

function requireCurrencyDefinition(
  currency: MoneyCurrency,
  unsupportedCode: DomainErrorCode,
): CurrencyDefinition {
  if (typeof currency !== "string") {
    return defineCurrency(currency);
  }

  const code = normalizeCurrencyCode(currency, unsupportedCode);

  if (code in currencyMinorUnits) {
    return defineCurrency({
      code,
      minorUnit: currencyMinorUnits[code as BuiltInCurrencyCode],
    });
  }

  throw new DomainError(unsupportedCode);
}

function normalizeDecimalString(
  value: string,
  {
    scale,
    fixedScale,
    signed,
    maxIntegerDigits,
    allowZero = false,
    invalidCode,
    precisionCode,
    overflowCode,
    nonPositiveCode,
    zeroCode,
  }: NormalizeOptions,
): { canonical: string; decimal: Decimal } {
  const lexeme = parseDecimalLexeme(value, invalidCode);

  if (lexeme.fractionalDigits.length > scale) {
    throw new DomainError(precisionCode);
  }

  if (
    maxIntegerDigits !== undefined &&
    countCanonicalIntegerDigits(lexeme.integerDigits) > maxIntegerDigits
  ) {
    throw new DomainError(overflowCode ?? precisionCode);
  }

  const decimal = new ExactDecimal(value);

  if (!decimal.isFinite()) {
    throw new DomainError(invalidCode);
  }

  if ((decimal.decimalPlaces() ?? 0) > scale) {
    throw new DomainError(precisionCode);
  }

  if (signed) {
    if (!allowZero && decimal.isZero()) {
      throw new DomainError(zeroCode ?? invalidCode);
    }
  } else if (decimal.lte(0)) {
    throw new DomainError(nonPositiveCode ?? invalidCode);
  }

  const fixed = decimal.toFixed(scale);
  const fixedLexeme = parseDecimalLexeme(fixed, invalidCode);

  if (
    maxIntegerDigits !== undefined &&
    countCanonicalIntegerDigits(fixedLexeme.integerDigits) > maxIntegerDigits
  ) {
    throw new DomainError(overflowCode ?? precisionCode);
  }

  const precise = decimal.toFixed(scale);

  return {
    canonical: fixedScale ? precise : trimTrailingZeros(precise),
    decimal,
  };
}

function canonicalizeMoneyDecimal(
  decimal: Decimal,
  currency: CurrencyDefinition,
): { canonical: string; decimal: Decimal } {
  return normalizeDecimalString(decimal.toFixed(currency.minorUnit), {
    scale: currency.minorUnit,
    fixedScale: true,
    signed: false,
    maxIntegerDigits: MONEY_MAX_INTEGER_DIGITS,
    invalidCode: "money_invalid_decimal",
    precisionCode: "money_precision_exceeded",
    overflowCode: "money_amount_overflow",
    nonPositiveCode: "money_non_positive",
  });
}

export function normalizeSignedMoneyAmount(
  value: string,
  currency: MoneyCurrency,
  options?: { allowZero?: boolean },
): string {
  const supportedCurrency = requireCurrencyDefinition(
    currency,
    "money_currency_unsupported",
  );

  return normalizeDecimalString(value, {
    scale: supportedCurrency.minorUnit,
    fixedScale: true,
    signed: true,
    maxIntegerDigits: MONEY_MAX_INTEGER_DIGITS,
    allowZero: options?.allowZero ?? false,
    invalidCode: "money_invalid_decimal",
    precisionCode: "money_precision_exceeded",
    overflowCode: "money_amount_overflow",
    zeroCode: "journal_posting_zero_amount",
  }).canonical;
}

export class Money {
  readonly amount: string;
  readonly currencyCode: CurrencyCode;
  readonly minorUnit: number;
  readonly #decimal: Decimal;
  readonly #currency: CurrencyDefinition;

  private constructor(
    amount: string,
    currency: CurrencyDefinition,
    decimal: Decimal,
  ) {
    this.amount = amount;
    this.currencyCode = currency.code;
    this.minorUnit = currency.minorUnit;
    this.#currency = currency;
    this.#decimal = decimal;
  }

  static parse(value: string, currency: MoneyCurrency): Money {
    const supportedCurrency = requireCurrencyDefinition(
      currency,
      "money_currency_unsupported",
    );
    const { canonical, decimal } = normalizeDecimalString(value, {
      scale: supportedCurrency.minorUnit,
      fixedScale: true,
      signed: false,
      maxIntegerDigits: MONEY_MAX_INTEGER_DIGITS,
      invalidCode: "money_invalid_decimal",
      precisionCode: "money_precision_exceeded",
      overflowCode: "money_amount_overflow",
      nonPositiveCode: "money_non_positive",
    });

    return new Money(canonical, supportedCurrency, decimal);
  }

  plus(other: Money): Money {
    if (
      this.currencyCode !== other.currencyCode ||
      this.minorUnit !== other.minorUnit
    ) {
      throw new DomainError("money_currency_mismatch");
    }

    const { canonical, decimal } = canonicalizeMoneyDecimal(
      this.#decimal.plus(other.#decimal),
      this.#currency,
    );

    return new Money(canonical, this.#currency, decimal);
  }
}

export class Quantity {
  readonly amount: string;
  readonly #decimal: Decimal;

  private constructor(amount: string, decimal: Decimal) {
    this.amount = amount;
    this.#decimal = decimal;
  }

  static stock(value: string): Quantity {
    return Quantity.parse(value, 8);
  }

  static etf(value: string): Quantity {
    return Quantity.parse(value, 8);
  }

  static crypto(value: string): Quantity {
    return Quantity.parse(value, 18);
  }

  private static parse(value: string, scale: number): Quantity {
    const { canonical, decimal } = normalizeDecimalString(value, {
      scale,
      fixedScale: false,
      signed: false,
      maxIntegerDigits: QUANTITY_MAX_INTEGER_DIGITS,
      invalidCode: "quantity_invalid_decimal",
      precisionCode: "quantity_precision_exceeded",
      nonPositiveCode: "quantity_non_positive",
    });

    return new Quantity(canonical, decimal);
  }
}

export class Rate {
  readonly value: string;
  readonly #decimal: Decimal;

  private constructor(value: string, decimal: Decimal) {
    this.value = value;
    this.#decimal = decimal;
  }

  static parse(value: string): Rate {
    const { canonical, decimal } = normalizeDecimalString(value, {
      scale: 18,
      fixedScale: true,
      signed: false,
      maxIntegerDigits: RATE_MAX_INTEGER_DIGITS,
      invalidCode: "rate_invalid_decimal",
      precisionCode: "rate_precision_exceeded",
      nonPositiveCode: "rate_non_positive",
    });

    return new Rate(canonical, decimal);
  }
}

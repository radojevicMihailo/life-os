import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { DomainError } from "@/modules/finance/domain/errors";
import {
  defineCurrency,
  Money,
  normalizeSignedMoneyAmount,
  Quantity,
  Rate,
} from "@/modules/finance/domain/money";

function expectDomainCode(action: () => unknown, code: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    expect((error as DomainError).message).toBe(code);
    return;
  }

  throw new Error(`Expected DomainError ${code}`);
}

describe("Money", () => {
  it("adds decimal amounts exactly without binary float drift", () => {
    const total = Money.parse("0.10", "EUR").plus(Money.parse("0.20", "EUR"));

    expect(total.amount).toBe("0.30");
    expect(total.currencyCode).toBe("EUR");
  });

  it("canonicalizes to the currency minor unit", () => {
    expect(Money.parse("001.2", "USD").amount).toBe("1.20");
  });

  it("accepts an explicit catalog currency definition without using the built-in map", () => {
    const chf = defineCurrency({ code: "CHF", minorUnit: 2 });

    expect(Money.parse("001.2", chf).amount).toBe("1.20");
    expect(normalizeSignedMoneyAmount("-1.20", chf)).toBe("-1.20");
  });

  it("enforces lexical scale for explicit catalog currency definitions", () => {
    const chf = defineCurrency({ code: "CHF", minorUnit: 2 });

    expectDomainCode(
      () => Money.parse("1.230", chf),
      "money_precision_exceeded",
    );
  });

  it("rejects unsupported currencies", () => {
    expectDomainCode(
      () => Money.parse("1.00", "GBP" as "EUR"),
      "money_currency_unsupported",
    );
  });

  it("rejects non-positive business input amounts", () => {
    expectDomainCode(() => Money.parse("0", "EUR"), "money_non_positive");
    expectDomainCode(() => Money.parse("-1.00", "EUR"), "money_non_positive");
  });

  it("rejects exponent notation and malformed decimals", () => {
    expectDomainCode(() => Money.parse("1e2", "EUR"), "money_invalid_decimal");
    expectDomainCode(() => Money.parse("NaN", "EUR"), "money_invalid_decimal");
    expectDomainCode(
      () => Money.parse("Infinity", "EUR"),
      "money_invalid_decimal",
    );
  });

  it("rejects amounts beyond currency precision", () => {
    expectDomainCode(
      () => Money.parse("1.001", "EUR"),
      "money_precision_exceeded",
    );
  });

  it("rejects trailing-zero money inputs that exceed the lexical scale boundary", () => {
    expectDomainCode(
      () => Money.parse("1.230", "EUR"),
      "money_precision_exceeded",
    );
  });

  it("rejects arithmetic across currencies", () => {
    expectDomainCode(
      () => Money.parse("1.00", "EUR").plus(Money.parse("1.00", "USD")),
      "money_currency_mismatch",
    );
  });

  it("keeps large-value addition exact even if the global Decimal config is hostile", () => {
    const originalPrecision = Decimal.precision;
    const originalRounding = Decimal.rounding;

    Decimal.set({ precision: 5, rounding: Decimal.ROUND_DOWN });

    try {
      const total = Money.parse("12345678901234567890.10", "EUR").plus(
        Money.parse("0.01", "EUR"),
      );

      expect(total.amount).toBe("12345678901234567890.11");
    } finally {
      Decimal.set({
        precision: originalPrecision,
        rounding: originalRounding,
      });
    }
  });

  it("rejects additions that overflow the supported money range", () => {
    expectDomainCode(
      () =>
        Money.parse("999999999999999999999999999999999999.99", "EUR").plus(
          Money.parse("0.01", "EUR"),
        ),
      "money_amount_overflow",
    );
  });

  it("does not expose the unsafe fromDecimal ingress publicly", () => {
    expect(
      "fromDecimal" in (Money as unknown as Record<string, unknown>),
    ).toBe(false);
  });
});

describe("Quantity", () => {
  it("canonicalizes stock and etf quantities to trimmed decimals up to 8 places", () => {
    expect(Quantity.stock("1.23000000").amount).toBe("1.23");
  });

  it("supports crypto quantities with 18 decimal places", () => {
    expect(Quantity.crypto("0.123456789012345678").amount).toBe(
      "0.123456789012345678",
    );
  });

  it.each([
    ["stock", Quantity.stock],
    ["etf", Quantity.etf],
    ["crypto", Quantity.crypto],
  ] as const)(
    "enforces the numeric(48,24) 24-integer-digit boundary for %s",
    (_assetClass, parse) => {
      expect(parse("999999999999999999999999").amount).toBe(
        "999999999999999999999999",
      );
      expectDomainCode(
        () => parse("1000000000000000000000000"),
        "quantity_precision_exceeded",
      );
    },
  );

  it("rejects trailing-zero quantity inputs that exceed the lexical scale boundary", () => {
    expectDomainCode(
      () => Quantity.stock("1.230000000"),
      "quantity_precision_exceeded",
    );
    expectDomainCode(
      () => Quantity.crypto("1.2300000000000000000"),
      "quantity_precision_exceeded",
    );
  });

  it("rejects non-positive, exponent, and excess-precision quantities", () => {
    expectDomainCode(() => Quantity.crypto("0"), "quantity_non_positive");
    expectDomainCode(
      () => Quantity.stock("1.123456789"),
      "quantity_precision_exceeded",
    );
    expectDomainCode(
      () => Quantity.crypto("1e-8"),
      "quantity_invalid_decimal",
    );
  });
});

describe("Rate", () => {
  it("parses positive rates with up to 18 decimal places into canonical decimal strings", () => {
    expect(Rate.parse("001.230000000000000000").value).toBe(
      "1.230000000000000000",
    );
  });

  it("rejects non-positive, exponent, trailing-zero excess scale, and malformed rates", () => {
    expectDomainCode(() => Rate.parse("0"), "rate_non_positive");
    expectDomainCode(() => Rate.parse("-1"), "rate_non_positive");
    expectDomainCode(() => Rate.parse("1e-2"), "rate_invalid_decimal");
    expectDomainCode(
      () => Rate.parse("1.2300000000000000000"),
      "rate_precision_exceeded",
    );
    expectDomainCode(() => Rate.parse("Infinity"), "rate_invalid_decimal");
  });
});

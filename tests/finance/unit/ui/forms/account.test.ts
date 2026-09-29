import { describe, expect, it } from "vitest";

import {
  parseAccountForm,
  parseActivateCurrencyForm,
  parseUpdateAccountForm,
} from "@/modules/finance/ui/forms/account";

describe("account forms", () => {
  it("normalizes account text and ISO currency", () => {
    expect(parseAccountForm({
      name: "  Tekući račun ",
      classification: "asset",
      subtype: " bank ",
      currencyCode: "rsd",
    })).toEqual({
      name: "Tekući račun",
      classification: "asset",
      subtype: "bank",
      currencyCode: "RSD",
    });
  });

  it("accepts only an ISO catalog code for activation", () => {
    expect(parseActivateCurrencyForm({ currencyCode: "gbp" })).toEqual({ currencyCode: "GBP" });
    expect(() => parseActivateCurrencyForm({ currencyCode: "bitcoin" })).toThrow();
  });

  it("requires an account id when editing and normalizes edited fields", () => {
    expect(parseUpdateAccountForm({
      id: " account-1 ", name: "  Tekući ", classification: "asset",
      subtype: " banka ", currencyCode: "rsd",
    })).toEqual({
      id: "account-1", name: "Tekući", classification: "asset",
      subtype: "banka", currencyCode: "RSD",
    });
    expect(() => parseUpdateAccountForm({ name: "Tekući", classification: "asset", subtype: "banka", currencyCode: "RSD" })).toThrow();
  });
});

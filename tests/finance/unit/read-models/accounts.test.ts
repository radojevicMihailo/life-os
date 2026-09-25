import { describe, expect, it } from "vitest";

import { displayAccountActivityAmount } from "@/modules/finance/read-models/accounts";

describe("account activity view models", () => {
  it("shows a liability increase with the same positive sign as its display balance", () => {
    expect(
      displayAccountActivityAmount({
        accountId: "card",
        amount: "-100.000000000000000000",
        classification: "liability",
        currencyCode: "EUR",
      }),
    ).toBe("100");
  });
});

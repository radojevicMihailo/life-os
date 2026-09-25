import { describe, expect, it } from "vitest";

import { buildNativeAmounts } from "@/modules/finance/read-models/transactions";

describe("transaction native amount view models", () => {
  it("preserves both sides of a same-currency transfer instead of netting to zero", () => {
    expect(
      buildNativeAmounts([
        {
          accountClassification: "asset",
          accountName: "Tekući",
          amount: "-40.000000000000000000",
          currencyCode: "EUR",
        },
        {
          accountClassification: "asset",
          accountName: "Štednja",
          amount: "40.000000000000000000",
          currencyCode: "EUR",
        },
      ]),
    ).toEqual([
      { accountName: "Tekući", amount: "-40", currencyCode: "EUR" },
      { accountName: "Štednja", amount: "40", currencyCode: "EUR" },
    ]);
  });
});

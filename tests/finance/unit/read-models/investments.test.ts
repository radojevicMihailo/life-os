import { describe, expect, it } from "vitest";

import {
  calculateRealizedReturnEur,
  mergePositionValuations,
} from "@/modules/finance/read-models/investments";

describe("investment position view models", () => {
  it("keeps an open position visible when its market quote is missing", () => {
    const positions = mergePositionValuations(
      [
        {
          accountName: "Kripto",
          class: "crypto",
          instrumentId: "btc",
          investmentAccountId: "wallet",
          name: "Bitcoin",
          quantity: "0.25",
          quoteCurrencyCode: "EUR",
          symbol: "BTC",
        },
      ],
      [],
    );

    expect(positions).toEqual([
      expect.objectContaining({
        instrumentId: "btc",
        marketValue: null,
        marketValueEur: null,
        quantity: "0.25",
        symbol: "BTC",
        valuationMissing: true,
      }),
    ]);
  });

  it("retains realized return after a position is fully sold", () => {
    expect(
      calculateRealizedReturnEur([
        {
          acquisitionFxRateToEur: "1",
          costBasisAmount: "70",
          proceedsAmount: "100",
          saleFxRateToEur: "1.1",
        },
      ]),
    ).toBe("40");
  });
});

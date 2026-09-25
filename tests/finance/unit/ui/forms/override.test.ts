import { describe, expect, it } from "vitest";

import { parseOverrideForm } from "@/modules/finance/ui/forms/override";

describe("manual override forms", () => {
  it("normalizes exchange rates and market prices at the UI boundary", () => {
    expect(parseOverrideForm({
      kind: "exchange_rate",
      baseCurrencyCode: "rsd",
      quoteCurrencyCode: "eur",
      value: "0,0085",
    })).toEqual({
      kind: "exchange_rate",
      baseCurrencyCode: "RSD",
      quoteCurrencyCode: "EUR",
      value: "0.0085",
    });
  });
});

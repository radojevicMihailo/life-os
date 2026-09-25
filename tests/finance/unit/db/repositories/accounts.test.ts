import { describe, expect, it } from "vitest";

import { orderSystemAccountRequests } from "@/modules/finance/db/repositories/accounts";

describe("system account request ordering", () => {
  it("orders FX system account acquisition identically for opposite transfer directions", () => {
    const eurToUsd = orderSystemAccountRequests([
      {
        classification: "equity",
        currencyCode: "EUR",
        now: new Date("2026-08-22T12:00:00.000Z"),
        role: "from",
        subtype: "foreign_exchange",
      },
      {
        classification: "equity",
        currencyCode: "USD",
        now: new Date("2026-08-22T12:00:00.000Z"),
        role: "to",
        subtype: "foreign_exchange",
      },
    ]);
    const usdToEur = orderSystemAccountRequests([
      {
        classification: "equity",
        currencyCode: "USD",
        now: new Date("2026-08-22T12:00:00.000Z"),
        role: "from",
        subtype: "foreign_exchange",
      },
      {
        classification: "equity",
        currencyCode: "EUR",
        now: new Date("2026-08-22T12:00:00.000Z"),
        role: "to",
        subtype: "foreign_exchange",
      },
    ]);

    expect(eurToUsd.map((request) => request.id)).toEqual([
      "system-foreign-exchange-usd",
      "system-fx",
    ]);
    expect(usdToEur.map((request) => request.id)).toEqual([
      "system-foreign-exchange-usd",
      "system-fx",
    ]);
  });
});

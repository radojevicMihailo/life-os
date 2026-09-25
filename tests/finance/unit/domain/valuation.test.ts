import { describe, expect, it } from "vitest";

import {
  calculateNetWorthEur,
  selectEffectiveValue,
  type ValuationCandidate,
} from "@/modules/finance/domain/valuation";

const now = new Date("2026-08-30T12:00:00.000Z");

function candidate(
  value: string,
  effectiveAt = new Date("2026-08-30T08:00:00.000Z"),
): ValuationCandidate {
  return { value, source: "test-provider", effectiveAt };
}

describe("effective valuation values", () => {
  it("keeps an explicit manual value effective over a newer automatic refresh", () => {
    const result = selectEffectiveValue({
      automatic: candidate("99", new Date("2026-08-30T11:00:00.000Z")),
      manual: candidate("101", new Date("2026-08-29T10:00:00.000Z")),
      now,
      staleAfterMs: 24 * 60 * 60 * 1_000,
    });

    expect(result).toMatchObject({ manual: true, source: "manual", stale: false, value: "101" });
    expect(result?.ageMs).toBe(93_600_000);
  });

  it("marks a last-known automatic value stale from its provider effective time", () => {
    expect(selectEffectiveValue({
      automatic: candidate("99", new Date("2026-08-28T11:59:59.999Z")),
      now,
      staleAfterMs: 48 * 60 * 60 * 1_000,
    })).toMatchObject({ manual: false, stale: true, value: "99" });
  });

  it("reports a missing effective value instead of inventing a conversion", () => {
    expect(selectEffectiveValue({ now, staleAfterMs: 1_000 })).toBeNull();
  });
});

describe("EUR net worth aggregation", () => {
  it("adds asset and receivable balances and subtracts liability balances exactly", () => {
    const result = calculateNetWorthEur({
      accounts: [
        { accountId: "cash", classification: "asset", currencyCode: "EUR", nativeAmount: "100.10" },
        { accountId: "loaned", classification: "receivable", currencyCode: "RSD", nativeAmount: "11720" },
        { accountId: "card", classification: "liability", currencyCode: "USD", nativeAmount: "50" },
      ],
      investments: [{ instrumentId: "btc", eurAmount: "25.05" }],
      ratesToEur: new Map([
        ["RSD", candidate("0.008532423208191126")],
        ["USD", candidate("0.85")],
      ]),
    });

    expect(result.totalEur).toBe("182.65");
    expect(result.accounts.map((account) => [account.accountId, account.eurAmount]))
      .toEqual([["cash", "100.1"], ["loaned", "100"], ["card", "42.5"]]);
  });

  it("makes the total unavailable when a nonzero native balance lacks an EUR conversion", () => {
    const result = calculateNetWorthEur({
      accounts: [{
        accountId: "cash-huf",
        classification: "asset",
        currencyCode: "HUF",
        nativeAmount: "1000",
      }],
      investments: [],
      ratesToEur: new Map(),
    });

    expect(result.totalEur).toBeNull();
    expect(result.missingConversions).toEqual(["HUF"]);
    expect(result.accounts[0]).toMatchObject({ nativeAmount: "1000", eurAmount: null });
  });
});

import { describe, expect, it } from "vitest";
import * as funds from "@/modules/finance/domain/goal-funds";
import { selectEffectiveValue } from "@/modules/finance/domain/valuation";
const now = new Date("2026-10-03T12:00:00Z");
const rate = (value: string, effectiveAt = now) => selectEffectiveValue({ automatic: { value, source: "nbs", effectiveAt, retrievedAt: now }, now, staleAfterMs: 3600000 })!;

describe("goal fund conversions", () => {
  it("adds EUR and RSD reservations through their rates to EUR", () => {
    const rates = new Map([["RSD", rate("0.008")]]);
    expect(funds.convertGoalReservation("800", "EUR", "EUR", rates).amount).toBe("800");
    expect(funds.convertGoalReservation("25000", "RSD", "EUR", rates).amount).toBe("200");
    expect(funds.convertGoalReservation("800", "EUR", "RSD", rates).amount).toBe("100000");
  });
  it("marks missing conversions unknown and includes both FX sources and freshness", () => {
    expect(funds.convertGoalReservation("100", "USD", "RSD", new Map())).toMatchObject({ amount: null, valuation: { missingCurrencies: ["USD", "RSD"] } });
    const old = rate("0.008", new Date("2026-10-01T12:00:00Z"));
    const result = funds.convertGoalReservation("100", "USD", "RSD", new Map([["USD", rate("0.9")], ["RSD", old]]));
    expect(result.amount).toBe("11250");
    expect(result.valuation).toMatchObject({ stale: true, sourceToEur: { source: "nbs", value: "0.9" }, targetToEur: { effectiveAt: old.effectiveAt } });
  });
  it("needs no rate when native and target currencies match", () => {
    expect(funds.convertGoalReservation("123.45", "RSD", "RSD", new Map())).toMatchObject({ amount: "123.45", valuation: { stale: false, missingCurrencies: [] } });
  });
});

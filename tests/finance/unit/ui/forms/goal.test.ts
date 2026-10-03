import { describe, expect, it } from "vitest";
import { parseGoalForm } from "@/modules/finance/ui/forms/goal";

describe("goal fund forms", () => {
  it("creates an account-independent fund with its chosen target currency", () => {
    expect(parseGoalForm({ id: "goal-1", name: "  Rezerva ", targetCurrencyCode: "eur", targetAmount: "10.000,50" }))
      .toEqual({ id: "goal-1", name: "Rezerva", targetCurrencyCode: "EUR", targetAmount: "10000.5" });
  });
  it("ignores legacy account fields and rejects zero target amounts", () => {
    expect(parseGoalForm({ name: "Fund", accountId: "legacy", targetCurrencyCode: "RSD", targetAmount: "100" }))
      .not.toHaveProperty("accountId");
    expect(() => parseGoalForm({ name: "Fund", targetCurrencyCode: "EUR", targetAmount: "0" })).toThrow();
  });
});

import { describe, expect, it } from "vitest";

import { parseGoalForm } from "@/modules/finance/ui/forms/goal";

describe("goal forms", () => {
  it("normalizes create and edit values without deriving currency itself", () => {
    expect(parseGoalForm({
      id: "goal-1",
      name: "  Rezerva ",
      accountId: "savings",
      targetCurrencyCode: "eur",
      targetAmount: "10.000,50",
    })).toEqual({
      id: "goal-1",
      name: "Rezerva",
      accountId: "savings",
      targetCurrencyCode: "EUR",
      targetAmount: "10000.5",
    });
  });
});

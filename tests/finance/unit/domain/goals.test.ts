import { describe, expect, it } from "vitest";

import { calculateGoalProgress } from "@/modules/finance/domain/goals";

describe("goal progress", () => {
  it("derives a percentage with Decimal without clamping negative or over-target balances", () => {
    expect(calculateGoalProgress({ balance: "125", target: "100" })).toEqual({
      balance: "125",
      percentage: "125",
    });
    expect(calculateGoalProgress({ balance: "-25", target: "100" })).toEqual({
      balance: "-25",
      percentage: "-25",
    });
  });
});

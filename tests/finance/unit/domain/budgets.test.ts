import { describe, expect, it } from "vitest";

import {
  budgetMonth,
  calculatePeriod,
  isEligibleBudgetExpense,
  nextBudgetMonth,
} from "@/modules/finance/domain/budgets";

describe("budget periods", () => {
  it("carries a surplus into the next period", () => {
    expect(
      calculatePeriod({ base: "100", carryIn: "20", eligibleSpending: "90" }),
    ).toMatchObject({ available: "120", remaining: "30" });
  });

  it("carries overspending into the next period", () => {
    expect(
      calculatePeriod({ base: "100", carryIn: "-40", eligibleSpending: "80" }),
    ).toMatchObject({ available: "60", remaining: "-20" });
  });

  it("preserves a cent when rollover crosses the 20-digit boundary", () => {
    expect(
      calculatePeriod({
        base: "99999999999999999999.99",
        carryIn: "0.02",
        eligibleSpending: "0",
      }),
    ).toMatchObject({
      available: "100000000000000000000.01",
      remaining: "100000000000000000000.01",
    });
  });

  it("uses Europe/Belgrade calendar months across the DST offset", () => {
    expect(budgetMonth(new Date("2026-03-31T21:59:00.000Z"))).toBe("2026-03");
    expect(budgetMonth(new Date("2026-03-31T22:00:00.000Z"))).toBe("2026-04");
  });

  it("limits budget months to a bounded range and rejects final-month overflow", () => {
    expect(nextBudgetMonth("2100-11")).toBe("2100-12");
    expect(() => nextBudgetMonth("0000-01")).toThrow("Budget month is out of range");
    expect(() => nextBudgetMonth("2100-12")).toThrow("Budget month overflow");
  });

  it("counts only categorized expense postings, including categorized fees", () => {
    expect(
      isEligibleBudgetExpense({
        accountClassification: "expense",
        categoryId: "groceries",
      }),
    ).toBe(true);
    expect(
      isEligibleBudgetExpense({
        accountClassification: "expense",
        categoryId: "transfer-fees",
      }),
    ).toBe(true);

    expect(
      isEligibleBudgetExpense({
        accountClassification: "income",
        categoryId: "salary",
      }),
    ).toBe(false);
    expect(
      isEligibleBudgetExpense({ accountClassification: "asset" }),
    ).toBe(false);
    expect(
      isEligibleBudgetExpense({ accountClassification: "receivable" }),
    ).toBe(false);
  });
});

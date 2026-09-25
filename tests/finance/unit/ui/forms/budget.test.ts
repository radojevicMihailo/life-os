import { describe, expect, it } from "vitest";

import { parseBudgetForm } from "@/modules/finance/ui/forms/budget";

describe("budget forms", () => {
  it("normalizes a Serbian decimal amount", () => {
    expect(parseBudgetForm({
      categoryId: "food",
      month: "2026-09",
      currencyCode: "rsd",
      amount: "25.000,00",
    })).toEqual({
      categoryId: "food",
      month: "2026-09",
      currencyCode: "RSD",
      amount: "25000",
    });
  });
});

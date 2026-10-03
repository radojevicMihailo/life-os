import { expect, it } from "vitest";
import { decimalInputValue } from "@/modules/finance/ui/forms/input-value";
import { parseGoalForm } from "@/modules/finance/ui/forms/goal";
import { parseAccountPurposeForm } from "@/modules/finance/ui/forms/account-purpose";

it("retains canonical three-decimal amounts on unchanged goal and reservation edits", () => {
  const value = decimalInputValue("1.234");
  expect(parseGoalForm({ name: "Emergency", targetCurrencyCode: "BHD", targetAmount: value }).targetAmount).toBe("1.234");
  expect(parseAccountPurposeForm({ accountId: "cash", target: "goal:emergency", amount: value }).amount).toBe("1.234");
});
it("uses ungrouped Serbian input values without changing large decimal precision", () => {
  const value = decimalInputValue("12345678901234567890.12345678");
  expect(value).toBe("12345678901234567890,12345678");
  expect(decimalInputValue("800")).toBe("800");
  expect(decimalInputValue(undefined)).toBeUndefined();
});

import { describe, expect, it } from "vitest";
import { parseAccountPurposeForm, parseRemoveAccountPurposeForm } from "@/modules/finance/ui/forms/account-purpose";

describe("account purpose forms", () => {
  it("parses localized money and preserves identifiers containing colons", () => {
    expect(parseAccountPurposeForm({ accountId: "cash", target: "goal:goal:1", amount: "1.250,50" })).toEqual({ accountId: "cash", targetType: "goal", targetId: "goal:1", amount: "1250.5" });
  });
  it.each(["unknown:1", "goal:", "goal", ""])("rejects malformed target %s", (target) => {
    expect(() => parseAccountPurposeForm({ accountId: "cash", target, amount: "10" })).toThrow();
  });
  it.each(["-1", "0", "NaN", "1,2,3"])("rejects invalid amount %s", (amount) => {
    expect(() => parseAccountPurposeForm({ accountId: "cash", target: "budget:b1", amount })).toThrow();
  });
  it("requires both the account and reservation identifiers for removal", () => {
    expect(() => parseRemoveAccountPurposeForm({ id: "p1" })).toThrow();
  });
});

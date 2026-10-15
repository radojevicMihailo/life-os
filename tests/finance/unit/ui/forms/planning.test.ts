import { describe, it, expect } from "vitest";
import { parsePlanForm, parseConfirmationForm, parsePlanningHorizon } from "@/modules/finance/ui/forms/planning";
const rule = { name: "Račun", type: "expense", accountId: "a", categoryId: "c", amount: "1.000,50", startDate: "2026-01-31", endDate: "", frequency: "monthly" };
describe("planning form validation", () => {
    it("normalizes Serbian decimals and an empty end date", () => expect(parsePlanForm(rule)).toMatchObject({ amount: "1000.5", endDate: null, isPrimaryIncome: false }));
    it("rejects impossible calendar dates", () => expect(() => parsePlanForm({ ...rule, startDate: "2026-02-30" })).toThrow());
    it("requires the real payment date", () => expect(() => parseConfirmationForm({ ruleId: "r", dueDate: "2026-10-15", amount: "100" })).toThrow());
});
it("rejects out-of-range saved horizons without crashing rendering", () => {
    expect(parsePlanningHorizon("2028-01-01", "2026-10-15")).toMatchObject({ endDate: undefined, error: expect.any(String) });
    expect(parsePlanningHorizon("2026-10-20", "2026-10-15")).toEqual({ endDate: "2026-10-20", error: null });
});

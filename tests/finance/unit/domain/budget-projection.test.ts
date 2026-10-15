import { describe, it, expect } from "vitest";
import { projectBudget } from "@/modules/finance/domain/budget-projection";
describe("budget projection", () => {
    it("uses larger of trend and known remaining bills", () => expect(projectBudget({ available: "500", spent: "100", pending: "50", elapsedDays: 10, totalDays: 30, period: "current" }).projected).toBe("300"));
    it("includes large known obligations without adding them twice", () => expect(projectBudget({ available: "500", spent: "100", pending: "400", elapsedDays: 10, totalDays: 30, period: "current" }).projected).toBe("500"));
    it("handles negative capacity", () => expect(projectBudget({ available: "-20", spent: "10", pending: "0", elapsedDays: 10, totalDays: 30, period: "current" }).alerts).toContain("no_capacity"));
    it("avoids estimating future periods", () => expect(projectBudget({ available: "100", spent: "0", pending: "0", elapsedDays: 0, totalDays: 30, period: "future" }).projected).toBeNull());
});

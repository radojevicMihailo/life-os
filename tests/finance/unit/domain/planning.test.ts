import { describe, expect, it } from "vitest";
import { expandOccurrences, type PlanRule } from "@/modules/finance/domain/planning";
import { isCalendarDate } from "@/modules/finance/domain/calendar";
const rule: PlanRule = { id: "r", name: "Račun", type: "expense", accountId: "a", categoryId: "c", amount: "100", startDate: "2026-01-31", endDate: null, frequency: "monthly", isPrimaryIncome: false, archivedAt: null };
describe("planning calendar", () => {
    it("retains day 31 after February", () => expect(expandOccurrences(rule, "2026-02-01", "2026-03-31").map(x => x.dueDate)).toEqual(["2026-02-28", "2026-03-31"]));
    it("anchors a yearly leap day", () => expect(expandOccurrences({ ...rule, startDate: "2024-02-29", frequency: "yearly" }, "2025-01-01", "2025-12-31").map(x => x.dueDate)).toEqual(["2025-02-28"]));
    it("keeps weekly dates across DST", () => expect(expandOccurrences({ ...rule, startDate: "2026-03-22", frequency: "weekly" }, "2026-03-22", "2026-04-05").map(x => x.dueDate)).toEqual(["2026-03-22", "2026-03-29", "2026-04-05"]));
    it("respects once and end dates", () => {
        expect(expandOccurrences({ ...rule, frequency: "once" }, "2026-02-01", "2026-03-01")).toEqual([]);
        expect(expandOccurrences({ ...rule, endDate: "2026-02-28" }, "2026-02-01", "2026-03-31").map(x => x.dueDate)).toEqual(["2026-02-28"]);
    });
    it("rejects malformed dates without throwing during URL validation", () => {
        expect(isCalendarDate("2026-99-99")).toBe(false);
        expect(isCalendarDate("2026-02-30")).toBe(false);
    });
});

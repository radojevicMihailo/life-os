import { describe, it, expect } from "vitest";
import { calculateAvailableCash } from "@/modules/finance/domain/available-cash";
describe("spendable cash", () => {
    const account = { id: "a", balance: "1000", goalReserved: "200", otherReserved: "0", uncoveredPending: "0", groups: [{ categoryId: "c", month: "2026-10", reserved: "300", pending: "100" }] };
    it("counts matching reservation and obligations once", () => expect(calculateAvailableCash([account], 10)).toEqual({ available: "500", daily: "50", deficit: "0" }));
    it("does not reuse a reservation for several bills", () => expect(calculateAvailableCash([{ ...account, groups: [{ categoryId: "c", month: "2026-10", reserved: "150", pending: "300" }] }], 10).available).toBe("500"));
    it("preserves negative balances and exposes deficit", () => expect(calculateAvailableCash([{ ...account, balance: "-10", groups: [], goalReserved: "0" }], 0)).toEqual({ available: "-10", daily: "0", deficit: "10" }));
});

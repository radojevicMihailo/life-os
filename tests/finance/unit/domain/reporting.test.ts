import { describe, it, expect } from "vitest";
import { calculateSavingsRate } from "@/modules/finance/domain/reporting";
describe("monthly savings", () => {
    it("derives savings from income and expenses", () => expect(calculateSavingsRate("1000", "750")).toBe("25"));
    it("omits a meaningless rate for zero income", () => expect(calculateSavingsRate("0", "100")).toBeNull());
    it("does not fill missing conversions with zero", () => expect(calculateSavingsRate(null, "100")).toBeNull());
});

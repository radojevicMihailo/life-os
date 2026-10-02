import { describe, expect, it } from "vitest";
import { calculateAccountPurposeBalance, reservationFits } from "@/modules/finance/domain/account-purposes";

describe("account purpose balances", () => {
  it("shows free money and a deficit after spending reduces the balance", () => {
    expect(calculateAccountPurposeBalance("100", ["25", "35"])).toEqual({ reserved: "60", free: "40", deficit: "0" });
    expect(calculateAccountPurposeBalance("20", ["25", "35"])).toEqual({ reserved: "60", free: "0", deficit: "40" });
    expect(calculateAccountPurposeBalance("-10", [])).toEqual({ reserved: "0", free: "0", deficit: "10" });
  });
  it("does not lose minor units near the maximum money value", () => {
    expect(calculateAccountPurposeBalance("99999999999999999999.99", ["99999999999999999999.98"])).toEqual({ reserved: "99999999999999999999.98", free: "0.01", deficit: "0" });
    expect(reservationFits("99999999999999999999.99", ["99999999999999999999.98"], "0.01")).toBe(true);
    expect(reservationFits("99999999999999999999.99", ["99999999999999999999.98"], "0.02")).toBe(false);
  });
  it("rejects allocations above the remaining balance including a negative balance", () => {
    expect(reservationFits("100", ["60"], "40")).toBe(true);
    expect(reservationFits("100", ["60"], "40.01")).toBe(false);
    expect(reservationFits("-10", [], "1")).toBe(false);
  });
});

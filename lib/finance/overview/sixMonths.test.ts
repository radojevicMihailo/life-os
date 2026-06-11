import { describe, it, expect } from "vitest";
import { sixMonthRange } from "./sixMonths";

describe("sixMonthRange", () => {
  it("returns six entries ending at the month containing today", () => {
    const res = sixMonthRange("2026-06-11");
    expect(res).toHaveLength(6);
    expect(res[5]?.month).toBe("2026-06");
    expect(res[0]?.month).toBe("2026-01");
  });

  it("each entry spans the full calendar month", () => {
    const res = sixMonthRange("2026-06-11");
    expect(res[5]).toEqual({ month: "2026-06", from: "2026-06-01", to: "2026-06-30" });
    expect(res[4]).toEqual({ month: "2026-05", from: "2026-05-01", to: "2026-05-31" });
  });

  it("crosses year boundary correctly", () => {
    const res = sixMonthRange("2026-02-15");
    expect(res.map((r) => r.month)).toEqual([
      "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
    ]);
  });

  it("handles February in leap years", () => {
    const res = sixMonthRange("2024-02-15");
    expect(res[5]).toEqual({ month: "2024-02", from: "2024-02-01", to: "2024-02-29" });
  });
});

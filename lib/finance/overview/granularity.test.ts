import { describe, it, expect } from "vitest";
import { chooseGranularity, daySpan } from "./granularity";

describe("chooseGranularity", () => {
  it("returns day when span <= 31 days", () => {
    expect(chooseGranularity("2026-06-01", "2026-06-30")).toBe("day"); // 30 days
    expect(chooseGranularity("2026-06-01", "2026-07-01")).toBe("day"); // 31 days inclusive
  });
  it("returns week when span between 32 and 90 days", () => {
    expect(chooseGranularity("2026-04-01", "2026-06-30")).toBe("week"); // 91 days inclusive -> still week boundary
    expect(chooseGranularity("2026-05-01", "2026-06-15")).toBe("week");
  });
  it("returns month when span > 90 days", () => {
    expect(chooseGranularity("2026-01-01", "2026-12-31")).toBe("month");
  });
  it("swaps reversed dates", () => {
    expect(chooseGranularity("2026-06-30", "2026-06-01")).toBe("day");
  });
});

describe("daySpan", () => {
  it("counts inclusive days", () => {
    expect(daySpan("2026-06-01", "2026-06-01")).toBe(1);
    expect(daySpan("2026-06-01", "2026-06-02")).toBe(2);
    expect(daySpan("2026-01-01", "2026-12-31")).toBe(365);
  });
});

import { describe, it, expect } from "vitest";
import { priorWindow } from "./momWindow";

describe("priorWindow", () => {
  it("returns equal-length window immediately before current", () => {
    expect(priorWindow("2026-06-01", "2026-06-30")).toEqual({
      from: "2026-05-02",
      to: "2026-05-31",
    });
  });

  it("works for single-day window", () => {
    expect(priorWindow("2026-06-11", "2026-06-11")).toEqual({
      from: "2026-06-10",
      to: "2026-06-10",
    });
  });

  it("crosses year boundary", () => {
    expect(priorWindow("2026-01-01", "2026-01-31")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});

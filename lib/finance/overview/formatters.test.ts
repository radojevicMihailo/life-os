import { describe, it, expect } from "vitest";
import { fmtEur, fmtPct, fmtDelta } from "./formatters";

describe("fmtEur", () => {
  it("formats EUR with 2 decimals and sr-RS locale", () => {
    expect(fmtEur(1234.5)).toMatch(/€/);
    expect(fmtEur(0)).toMatch(/0,00/);
  });
});

describe("fmtPct", () => {
  it("formats percentage with sign", () => {
    expect(fmtPct(0.1234)).toBe("+12,3%");
    expect(fmtPct(-0.05)).toBe("-5,0%");
    expect(fmtPct(0)).toBe("0,0%");
  });
});

describe("fmtDelta", () => {
  it("returns null when prior is zero", () => {
    expect(fmtDelta(100, 0)).toEqual({ pct: null, sign: 0 });
  });
  it("returns positive delta", () => {
    expect(fmtDelta(120, 100)).toEqual({ pct: 0.2, sign: 1 });
  });
  it("returns negative delta", () => {
    expect(fmtDelta(80, 100)).toEqual({ pct: -0.2, sign: -1 });
  });
});

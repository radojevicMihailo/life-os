import { describe, expect, it } from "vitest";
import { literalSearchPattern, listLimit, navigationMatches } from "./search";

describe("bounded literal search", () => {
  it("treats percent, underscore and backslash as literal input", () => {
    expect(literalSearchPattern("  50%_\\  ")).toBe("%50\\%\\_\\\\%");
  });
  it("bounds invalid and excessive load-more values", () => {
    expect(listLimit(undefined)).toBe(50);
    expect(listLimit("-1")).toBe(50);
    expect(listLimit("10000000")).toBe(500);
    expect(listLimit("100")).toBe(100);
    expect(listLimit("NaN")).toBe(50);
  });
  it("matches Serbian navigation with or without diacritics", () => {
    expect(navigationMatches("Beleške", "beleske")).toBe(true);
    expect(navigationMatches("Računi", "racuni")).toBe(true);
    expect(navigationMatches("Zadaci", "obroci")).toBe(false);
  });
});

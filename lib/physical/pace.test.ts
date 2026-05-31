import { describe, expect, it } from "vitest";
import { computePace } from "./pace";

describe("computePace", () => {
  it("standard pace", () => expect(computePace(10, 3000)).toBe(300));
  it("fractional km", () => expect(computePace(5.5, 1650)).toBe(300));
  it("zero distance is null", () => expect(computePace(0, 1200)).toBeNull());
  it("negative distance is null", () => expect(computePace(-1, 600)).toBeNull());
  it("rounds to nearest second", () => expect(computePace(3, 1001)).toBe(334));
});

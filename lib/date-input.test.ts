import { describe, expect, it } from "vitest";
import { defaultIntervalEnd, dateToInputValue } from "./date-input";

describe("default interval end", () => {
  it("starts a date-only end on the selected start date", () => {
    const start = new Date(1995, 7, 18, 0, 0);
    const end = defaultIntervalEnd(start, false);
    expect(dateToInputValue(end, false)).toBe("1995-08-18");
    expect(end).not.toBe(start);
  });
  it("sets a timed end one hour after the start without modifying the start", () => {
    const start = new Date(2026, 9, 7, 14, 30);
    expect(dateToInputValue(defaultIntervalEnd(start, true), true)).toBe("2026-10-07T15:30");
    expect(dateToInputValue(start, true)).toBe("2026-10-07T14:30");
  });
  it("moves to the next day when one hour crosses midnight", () => {
    expect(dateToInputValue(defaultIntervalEnd(new Date(2026, 11, 31, 23, 30), true), true)).toBe("2027-01-01T00:30");
  });
  it("clears the end when the start is cleared", () => {
    expect(defaultIntervalEnd(null, true)).toBeNull();
  });
});

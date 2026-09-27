import { describe, expect, it } from "vitest";
import { taskDateHasTime } from "./calendar-date";

describe("taskDateHasTime", () => {
  it("treats date-only tasks at Belgrade midnight as all-day across daylight saving", () => {
    expect(taskDateHasTime(new Date("2026-01-15T23:00:00.000Z"))).toBe(false);
    expect(taskDateHasTime(new Date("2026-09-26T22:00:00.000Z"))).toBe(false);
  });

  it("keeps tasks with an entered hour on the timeline", () => {
    expect(taskDateHasTime(new Date("2026-09-27T08:30:00.000Z"))).toBe(true);
  });
});

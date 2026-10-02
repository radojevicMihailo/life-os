import { afterEach, describe, expect, it } from "vitest";
import { mealTimeForInput, mealTimeToIso } from "./time";

const initialTimezone = process.env.TZ;
afterEach(() => {
  if (initialTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = initialTimezone;
});

describe("meal editor local time", () => {
  it.each([
    ["2026-07-10", "2026-07-10T10:00:00.000Z"],
    ["2026-01-10", "2026-01-10T11:00:00.000Z"],
  ])("does not shift an unchanged noon meal on %s", (day, saved) => {
    process.env.TZ = "Europe/Belgrade";
    let instant = saved;
    for (let edit = 0; edit < 3; edit++) {
      const time = mealTimeForInput(instant);
      expect(time).toBe("12:00");
      instant = mealTimeToIso(day, time)!;
      expect(instant).toBe(saved);
    }
  });

  it("preserves early morning meals whose UTC date is the previous day", () => {
    process.env.TZ = "Europe/Belgrade";
    const saved = "2026-07-09T22:30:00.000Z";
    expect(mealTimeForInput(saved)).toBe("00:30");
    expect(mealTimeToIso("2026-07-10", mealTimeForInput(saved))).toBe(saved);
  });

  it("preserves the precise instant during the repeated autumn daylight-saving hour", () => {
    process.env.TZ = "Europe/Belgrade";
    const saved = "2026-10-25T01:30:27.000Z";
    expect(mealTimeForInput(saved)).toBe("02:30");
    expect(mealTimeToIso("2026-10-25", mealTimeForInput(saved), saved)).toBe(saved);
  });

  it("follows the browser zone instead of assuming a UTC server", () => {
    process.env.TZ = "America/New_York";
    const saved = "2026-07-10T16:00:00.000Z";
    expect(mealTimeForInput(saved)).toBe("12:00");
    expect(mealTimeToIso("2026-07-10", mealTimeForInput(saved))).toBe(saved);
    expect(mealTimeForInput(null)).toBe("");
    expect(mealTimeToIso("2026-07-10", "")).toBeNull();
  });
});

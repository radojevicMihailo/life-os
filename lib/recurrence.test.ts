import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./recurrence";

const at = (iso: string) => new Date(iso);

describe("nextOccurrence — daily", () => {
  it("interval=1 advances by one day", () => {
    expect(nextOccurrence({ freq: "daily", interval: 1 }, at("2026-05-28T09:00:00Z")).toISOString())
      .toBe("2026-05-29T09:00:00.000Z");
  });

  it("interval=3 advances by three days", () => {
    expect(nextOccurrence({ freq: "daily", interval: 3 }, at("2026-05-28T09:00:00Z")).toISOString())
      .toBe("2026-05-31T09:00:00.000Z");
  });
});

describe("nextOccurrence — weekly without byweekday", () => {
  it("interval=1 advances by 7 days", () => {
    expect(nextOccurrence({ freq: "weekly", interval: 1 }, at("2026-05-28T09:00:00Z")).toISOString())
      .toBe("2026-06-04T09:00:00.000Z");
  });

  it("interval=2 advances by 14 days", () => {
    expect(nextOccurrence({ freq: "weekly", interval: 2 }, at("2026-05-28T09:00:00Z")).toISOString())
      .toBe("2026-06-11T09:00:00.000Z");
  });
});

describe("nextOccurrence — weekly with byweekday", () => {
  it("Mon→Wed when on Mon and weekdays=[1,3,5]", () => {
    // 2026-06-01 = Monday
    const result = nextOccurrence(
      { freq: "weekly", interval: 1, byweekday: [1, 3, 5] },
      at("2026-06-01T09:00:00Z"),
    );
    expect(result.toISOString().slice(0, 10)).toBe("2026-06-03"); // Wed
  });

  it("Wed→Fri when on Wed and weekdays=[1,3,5]", () => {
    const result = nextOccurrence(
      { freq: "weekly", interval: 1, byweekday: [1, 3, 5] },
      at("2026-06-03T09:00:00Z"),
    );
    expect(result.toISOString().slice(0, 10)).toBe("2026-06-05"); // Fri
  });

  it("Fri→next-Mon when on Fri and weekdays=[1,3,5]", () => {
    const result = nextOccurrence(
      { freq: "weekly", interval: 1, byweekday: [1, 3, 5] },
      at("2026-06-05T09:00:00Z"),
    );
    expect(result.toISOString().slice(0, 10)).toBe("2026-06-08"); // next Mon
  });

  it("interval=2 skips a week when wrapping", () => {
    // Fri 2026-06-05 → interval=2 → +2 weeks - dow + first = +14 - 5 + 1 = +10 days = 2026-06-15 Mon
    const result = nextOccurrence(
      { freq: "weekly", interval: 2, byweekday: [1] },
      at("2026-06-05T09:00:00Z"),
    );
    expect(result.toISOString().slice(0, 10)).toBe("2026-06-15");
  });
});

describe("nextOccurrence — monthly", () => {
  it("interval=1 advances one month", () => {
    expect(nextOccurrence({ freq: "monthly", interval: 1 }, at("2026-05-15T09:00:00Z")).toISOString())
      .toBe("2026-06-15T09:00:00.000Z");
  });

  it("clamps day when target month is shorter (Jan 31 → Feb 28/29)", () => {
    const result = nextOccurrence({ freq: "monthly", interval: 1 }, at("2026-01-31T09:00:00Z"));
    // 2026 is not a leap year
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("interval=3 advances three months", () => {
    expect(nextOccurrence({ freq: "monthly", interval: 3 }, at("2026-05-15T09:00:00Z")).toISOString())
      .toBe("2026-08-15T09:00:00.000Z");
  });
});

describe("nextOccurrence — invalid", () => {
  it("throws on interval < 1", () => {
    expect(() => nextOccurrence({ freq: "daily", interval: 0 }, new Date())).toThrow();
  });
});

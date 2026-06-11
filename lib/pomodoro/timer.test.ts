import { describe, it, expect } from "vitest";
import {
  defaultConfig,
  defaultState,
  phaseDurationMs,
  remainingMs,
  nextPhase,
  formatRemaining,
} from "./timer";
import type { PomodoroState } from "./types";

describe("defaultConfig", () => {
  it("returns 25/5/15 with 4 cycles", () => {
    expect(defaultConfig()).toEqual({
      workMin: 25,
      shortMin: 5,
      longMin: 15,
      cyclesUntilLong: 4,
    });
  });
});

describe("defaultState", () => {
  it("starts idle in work phase with config", () => {
    const s = defaultState();
    expect(s.phase).toBe("work");
    expect(s.status).toBe("idle");
    expect(s.startedAt).toBeNull();
    expect(s.elapsedBeforeStart).toBe(0);
    expect(s.cycleCount).toBe(0);
    expect(s.label).toBe("");
    expect(s.config).toEqual(defaultConfig());
  });
});

describe("phaseDurationMs", () => {
  it("converts minutes to ms per phase", () => {
    const cfg = defaultConfig();
    expect(phaseDurationMs("work", cfg)).toBe(25 * 60_000);
    expect(phaseDurationMs("short_break", cfg)).toBe(5 * 60_000);
    expect(phaseDurationMs("long_break", cfg)).toBe(15 * 60_000);
  });
});

describe("remainingMs", () => {
  const base: PomodoroState = {
    ...defaultState(),
    phase: "work",
  };

  it("returns full duration when idle", () => {
    expect(remainingMs(base, 1_000_000)).toBe(25 * 60_000);
  });

  it("decreases linearly when running", () => {
    const s: PomodoroState = {
      ...base,
      status: "running",
      startedAt: 1_000_000,
    };
    expect(remainingMs(s, 1_000_000 + 60_000)).toBe(24 * 60_000);
  });

  it("ignores wall-clock delta when paused", () => {
    const s: PomodoroState = {
      ...base,
      status: "paused",
      startedAt: 1_000_000,
      elapsedBeforeStart: 60_000,
    };
    expect(remainingMs(s, 1_000_000 + 999_999)).toBe(24 * 60_000);
  });

  it("clamps to 0 when overrun", () => {
    const s: PomodoroState = {
      ...base,
      status: "running",
      startedAt: 1_000_000,
    };
    expect(remainingMs(s, 1_000_000 + 26 * 60_000)).toBe(0);
  });
});

describe("nextPhase", () => {
  it("after work: short break when cycleCount+1 < cyclesUntilLong", () => {
    const s = { ...defaultState(), phase: "work" as const, cycleCount: 2 };
    expect(nextPhase(s)).toBe("short_break");
  });

  it("after work: long break when cycleCount+1 === cyclesUntilLong", () => {
    const s = { ...defaultState(), phase: "work" as const, cycleCount: 3 };
    expect(nextPhase(s)).toBe("long_break");
  });

  it("after short_break: work", () => {
    const s = { ...defaultState(), phase: "short_break" as const };
    expect(nextPhase(s)).toBe("work");
  });

  it("after long_break: work", () => {
    const s = { ...defaultState(), phase: "long_break" as const };
    expect(nextPhase(s)).toBe("work");
  });
});

describe("formatRemaining", () => {
  it("formats ms as mm:ss", () => {
    expect(formatRemaining(0)).toBe("00:00");
    expect(formatRemaining(59_000)).toBe("00:59");
    expect(formatRemaining(60_000)).toBe("01:00");
    expect(formatRemaining(25 * 60_000)).toBe("25:00");
  });

  it("rounds up sub-second remainder", () => {
    expect(formatRemaining(59_500)).toBe("01:00");
    expect(formatRemaining(1)).toBe("00:01");
  });
});

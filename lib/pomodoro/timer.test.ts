import { describe, it, expect } from "vitest";
import {
  advancePhase,
  defaultConfig,
  defaultState,
  formatRemaining,
  phaseDurationMs,
  remainingMs,
} from "./timer";
import type { PomodoroState } from "./types";

describe("work and break timer", () => {
  it("starts with a 90 minute work timer", () => {
    const state = defaultState();
    expect(state.phase).toBe("work");
    expect(state.status).toBe("idle");
    expect(state.taskId).toBeNull();
    expect(remainingMs(state, 1_000_000)).toBe(90 * 60_000);
    expect(defaultConfig()).toEqual({ workMin: 90, breakMin: 5 });
  });

  it("uses the configured durations for work and break", () => {
    const config = { workMin: 45, breakMin: 12 };
    expect(phaseDurationMs("work", config)).toBe(45 * 60_000);
    expect(phaseDurationMs("break", config)).toBe(12 * 60_000);
  });

  it("counts down while running and holds while paused", () => {
    const state: PomodoroState = {
      ...defaultState(),
      status: "running",
      startedAt: 1_000_000,
    };
    expect(remainingMs(state, 1_000_000 + 30 * 60_000)).toBe(60 * 60_000);
    expect(remainingMs({ ...state, status: "paused", elapsedBeforeStart: 30 * 60_000 }, 99_000_000)).toBe(60 * 60_000);
    expect(remainingMs(state, 1_000_000 + 91 * 60_000)).toBe(0);
  });

  it("does not show more than 90 minutes before the first timer tick", () => {
    const state: PomodoroState = {
      ...defaultState(),
      status: "running",
      startedAt: 1_000_000,
    };
    expect(remainingMs(state, 999_000)).toBe(90 * 60_000);
  });

  it("finishes work early and readies a configurable break", () => {
    const state: PomodoroState = {
      ...defaultState(),
      status: "running",
      startedAt: 1_000_000,
      label: "Writing",
      config: { workMin: 90, breakMin: 12 },
    };
    const next = advancePhase(state);
    expect(next).toMatchObject({
      phase: "break",
      status: "idle",
      startedAt: null,
      elapsedBeforeStart: 0,
      label: "Writing",
    });
    expect(remainingMs(next, 1_500_000)).toBe(12 * 60_000);
  });

  it("returns to the full work duration after a break", () => {
    const state: PomodoroState = {
      ...defaultState(),
      phase: "break",
      status: "running",
      startedAt: 1_000_000,
      config: { workMin: 90, breakMin: 12 },
    };
    const next = advancePhase(state);
    expect(next.phase).toBe("work");
    expect(next.status).toBe("idle");
    expect(remainingMs(next, 2_000_000)).toBe(90 * 60_000);
  });

});

describe("formatRemaining", () => {
  it("formats and rounds up remaining time", () => {
    expect(formatRemaining(0)).toBe("00:00");
    expect(formatRemaining(59_500)).toBe("01:00");
    expect(formatRemaining(90 * 60_000)).toBe("90:00");
  });
});

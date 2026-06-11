import type { Phase, PomodoroConfig, PomodoroState } from "./types";

export function defaultConfig(): PomodoroConfig {
  return { workMin: 25, shortMin: 5, longMin: 15, cyclesUntilLong: 4 };
}

export function defaultState(): PomodoroState {
  return {
    phase: "work",
    status: "idle",
    startedAt: null,
    elapsedBeforeStart: 0,
    cycleCount: 0,
    label: "",
    config: defaultConfig(),
  };
}

export function phaseDurationMs(phase: Phase, config: PomodoroConfig): number {
  switch (phase) {
    case "work":
      return config.workMin * 60_000;
    case "short_break":
      return config.shortMin * 60_000;
    case "long_break":
      return config.longMin * 60_000;
  }
}

export function remainingMs(state: PomodoroState, now: number): number {
  const total = phaseDurationMs(state.phase, state.config);
  const liveDelta =
    state.status === "running" && state.startedAt !== null
      ? now - state.startedAt
      : 0;
  const elapsed = state.elapsedBeforeStart + liveDelta;
  const remaining = total - elapsed;
  return remaining < 0 ? 0 : remaining;
}

export function nextPhase(state: PomodoroState): Phase {
  if (state.phase === "work") {
    return state.cycleCount + 1 >= state.config.cyclesUntilLong
      ? "long_break"
      : "short_break";
  }
  return "work";
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

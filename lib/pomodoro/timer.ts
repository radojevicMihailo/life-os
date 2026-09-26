import type { Phase, PomodoroConfig, PomodoroState } from "./types";

export function defaultConfig(): PomodoroConfig {
  return { workMin: 90, breakMin: 5 };
}

export function defaultState(): PomodoroState {
  return {
    phase: "work",
    status: "idle",
    startedAt: null,
    elapsedBeforeStart: 0,
    taskId: null,
    label: "",
    config: defaultConfig(),
  };
}

export function phaseDurationMs(phase: Phase, config: PomodoroConfig): number {
  return (phase === "work" ? config.workMin : config.breakMin) * 60_000;
}

export function remainingMs(state: PomodoroState, now: number): number {
  const total = phaseDurationMs(state.phase, state.config);
  const liveDelta =
    state.status === "running" && state.startedAt !== null
      ? Math.max(0, now - state.startedAt)
      : 0;
  const elapsed = state.elapsedBeforeStart + liveDelta;
  const remaining = total - elapsed;
  return remaining < 0 ? 0 : remaining;
}

export function advancePhase(state: PomodoroState): PomodoroState {
  return {
    ...state,
    phase: state.phase === "work" ? "break" : "work",
    status: "idle",
    startedAt: null,
    elapsedBeforeStart: 0,
  };
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

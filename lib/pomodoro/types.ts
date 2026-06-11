export type Phase = "work" | "short_break" | "long_break";

export type Status = "idle" | "running" | "paused" | "ended";

export type PomodoroConfig = {
  workMin: number;
  shortMin: number;
  longMin: number;
  cyclesUntilLong: number;
};

export type PomodoroState = {
  phase: Phase;
  status: Status;
  startedAt: number | null;
  elapsedBeforeStart: number;
  cycleCount: number;
  label: string;
  config: PomodoroConfig;
};

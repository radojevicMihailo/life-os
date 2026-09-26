export type Phase = "work" | "break";

export type Status = "idle" | "running" | "paused";

export type PomodoroConfig = {
  workMin: number;
  breakMin: number;
};

export type PomodoroState = {
  phase: Phase;
  status: Status;
  startedAt: number | null;
  elapsedBeforeStart: number;
  taskId: string | null;
  label: string;
  config: PomodoroConfig;
};

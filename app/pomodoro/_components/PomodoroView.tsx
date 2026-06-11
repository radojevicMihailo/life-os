"use client";

import { usePomodoro, phaseLabel } from "@/lib/pomodoro/context";
import { phaseDurationMs } from "@/lib/pomodoro/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfigPanel } from "./ConfigPanel";

const RADIUS = 120;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function nextPhaseButtonLabel(phase: "work" | "short_break" | "long_break") {
  if (phase === "work") return "Start break";
  return "Start work";
}

export function PomodoroView() {
  const {
    state,
    remaining,
    remainingLabel,
    start,
    pause,
    resume,
    reset,
    skip,
    startNextPhase,
    setLabel,
  } = usePomodoro();

  const total = phaseDurationMs(state.phase, state.config);
  const progress = total === 0 ? 0 : 1 - remaining / total;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pomodoro</h1>
        <span className="text-sm text-muted-foreground">
          Cycle {state.cycleCount} / {state.config.cyclesUntilLong}
        </span>
      </header>

      <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-8">
        <div className="text-sm uppercase tracking-wide text-muted-foreground">
          {phaseLabel(state.phase)}
        </div>

        <div className="relative">
          <svg
            width={RADIUS * 2 + STROKE}
            height={RADIUS * 2 + STROKE}
            viewBox={`0 0 ${RADIUS * 2 + STROKE} ${RADIUS * 2 + STROKE}`}
          >
            <circle
              cx={RADIUS + STROKE / 2}
              cy={RADIUS + STROKE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-muted/30"
            />
            <circle
              cx={RADIUS + STROKE / 2}
              cy={RADIUS + STROKE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RADIUS + STROKE / 2} ${RADIUS + STROKE / 2})`}
              className="text-primary transition-[stroke-dashoffset] duration-200"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-5xl tabular-nums">{remainingLabel}</span>
          </div>
        </div>

        <div className="w-full">
          <Input
            value={state.label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What are you working on?"
            aria-label="Working on"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {state.status === "idle" && (
            <Button type="button" onClick={start}>
              Start
            </Button>
          )}
          {state.status === "running" && (
            <Button type="button" onClick={pause} variant="secondary">
              Pause
            </Button>
          )}
          {state.status === "paused" && (
            <Button type="button" onClick={resume}>
              Resume
            </Button>
          )}
          {state.status === "ended" && (
            <Button type="button" onClick={startNextPhase}>
              {nextPhaseButtonLabel(state.phase)}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={reset}>
            Reset
          </Button>
          <Button type="button" variant="ghost" onClick={skip}>
            Skip
          </Button>
        </div>
      </div>

      <ConfigPanel />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePomodoro, phaseLabel } from "@/lib/pomodoro/context";
import { phaseDurationMs } from "@/lib/pomodoro/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfigPanel } from "./ConfigPanel";

const RADIUS = 120;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TaskOption = { id: string; title: string; projectName: string | null };

export function PomodoroView({ tasks, taskLoadError = false }: { tasks: TaskOption[]; taskLoadError?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const {
    state,
    remaining,
    remainingLabel,
    start,
    pause,
    resume,
    reset,
    finishPhase,
    setTaskId,
    setLabel,
  } = usePomodoro();

  const selectedTask = tasks.find((task) => task.id === state.taskId);
  const query = taskQuery.trim().toLowerCase();
  const matchingTasks = query
    ? tasks.filter((task) => `${task.title} ${task.projectName ?? ""}`.toLowerCase().includes(query))
    : tasks;
  const total = phaseDurationMs(state.phase, state.config);
  const progress = total === 0 ? 0 : 1 - remaining / total;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pomodoro</h1>
      </header>

      <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-8">
        <div className="text-sm uppercase tracking-wide text-muted-foreground">
          {phaseLabel(state.phase)}
        </div>
        {state.phase === "break" && state.status === "idle" && (
          <p className="text-center text-sm text-muted-foreground">
            Set your break duration below, then start the timer.
          </p>
        )}

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

        <div className="w-full space-y-2">
          <Label htmlFor="pomodoro-task">Working on</Label>
          <Popover
            open={pickerOpen}
            onOpenChange={(open) => {
              setPickerOpen(open);
              if (!open) setTaskQuery("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                id="pomodoro-task"
                type="button"
                variant="outline"
                className="w-full min-w-0 justify-between"
              >
                <span className="truncate">
                  {selectedTask?.title ?? (taskLoadError ? "Task list unavailable" : state.taskId ? "Task no longer active" : "Choose a task or write manually")}
                </span>
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
              <Input
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
                autoFocus
              />
              <div className="max-h-56 space-y-1 overflow-y-auto">
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => {
                    setTaskId(null);
                    setPickerOpen(false);
                    setTaskQuery("");
                  }}
                >
                  No task — write manually
                </button>
                {matchingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => {
                      setTaskId(task.id);
                      setPickerOpen(false);
                      setTaskQuery("");
                    }}
                  >
                    <span className="block truncate">{task.title}</span>
                    {task.projectName && (
                      <span className="block truncate text-xs text-muted-foreground">{task.projectName}</span>
                    )}
                  </button>
                ))}
                {matchingTasks.length === 0 && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    {taskLoadError ? "Task list unavailable. Try reloading the page." : tasks.length === 0 ? "No active tasks yet." : "No tasks match your search."}
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {state.taskId === null && (
            <Input
              value={state.label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Describe your work"
              aria-label="Manual work description"
            />
          )}
          {selectedTask && (
            <Link href={`/tasks/${selectedTask.id}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Open task
            </Link>
          )}
          {state.taskId && !selectedTask && !taskLoadError && (
            <p className="text-xs text-muted-foreground">
              This task is no longer active. Choose another task or{" "}
              <button type="button" className="underline" onClick={() => setTaskId(null)}>
                write manually
              </button>
              .
            </p>
          )}
          {taskLoadError && (
            <p className="text-xs text-muted-foreground">
              The task list is unavailable. The timer still works; reload to try again.
              {state.taskId && (
                <>
                  {" "}You can also{" "}
                  <button type="button" className="underline" onClick={() => setTaskId(null)}>
                    write manually
                  </button>
                  .
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {state.status === "idle" && (
            <Button type="button" onClick={start}>
              Start {state.phase === "work" ? "work" : "break"}
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
          {state.status !== "idle" && (
            <>
              <Button type="button" variant="outline" onClick={finishPhase}>
                {state.phase === "work" ? "Stop work" : "End break"}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Reset
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfigPanel />
    </div>
  );
}

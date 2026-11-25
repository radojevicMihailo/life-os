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

      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card shadow-sm p-8">
        <div className="text-sm uppercase tracking-wide text-muted-foreground">
          {phaseLabel(state.phase)}
        </div>
        {state.phase === "break" && state.status === "idle" && (
          <p className="text-center text-sm text-muted-foreground">
            Podesi trajanje pauze ispod, pa pokreni tajmer.
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
          <Label htmlFor="pomodoro-task">Na čemu radiš</Label>
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
                  {selectedTask?.title ?? (taskLoadError ? "Lista zadataka nije dostupna" : state.taskId ? "Zadatak više nije aktivan" : "Izaberi zadatak ili unesi opis")}
                </span>
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
              <Input
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
                placeholder="Pretraži zadatke…"
                aria-label="Pretraži zadatke"
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
                  Bez zadatka, unesi opis
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
                    {taskLoadError ? "Lista zadataka nije dostupna. Osveži stranicu i pokušaj ponovo." : tasks.length === 0 ? "Još nema aktivnih zadataka." : "Nema zadataka koji odgovaraju pretrazi."}
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {state.taskId === null && (
            <Input
              value={state.label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Opiši na čemu radiš"
              aria-label="Opis rada"
            />
          )}
          {selectedTask && (
            <Link href={`/tasks/${selectedTask.id}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Otvori zadatak
            </Link>
          )}
          {state.taskId && !selectedTask && !taskLoadError && (
            <p className="text-xs text-muted-foreground">
              Ovaj zadatak više nije aktivan. Izaberi drugi zadatak ili{" "}
              <button type="button" className="underline" onClick={() => setTaskId(null)}>
                uneseš opis
              </button>
              .
            </p>
          )}
          {taskLoadError && (
            <p className="text-xs text-muted-foreground">
              Lista zadataka nije dostupna. Tajmer i dalje radi. Osveži stranicu i pokušaj ponovo.
              {state.taskId && (
                <>
                  {" "}Možeš i da{" "}
                  <button type="button" className="underline" onClick={() => setTaskId(null)}>
                    uneseš opis
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
              {state.phase === "work" ? "Započni rad" : "Započni pauzu"}
            </Button>
          )}
          {state.status === "running" && (
            <Button type="button" onClick={pause} variant="secondary">
              Pauziraj
            </Button>
          )}
          {state.status === "paused" && (
            <Button type="button" onClick={resume}>
              Nastavi
            </Button>
          )}
          {state.status !== "idle" && (
            <>
              <Button type="button" variant="outline" onClick={finishPhase}>
                {state.phase === "work" ? "Završi rad" : "Završi pauzu"}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Vrati na početak
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfigPanel />
    </div>
  );
}

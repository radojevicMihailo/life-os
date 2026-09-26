"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { usePomodoro, phaseLabel } from "@/lib/pomodoro/context";

export function PomodoroBadge() {
  const { state, remainingLabel } = usePomodoro();
  if (state.status === "idle") return null;

  const statusText = state.status === "paused" ? "Paused" : remainingLabel;

  return (
    <Link
      href="/pomodoro"
      className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border bg-card px-1.5 py-1 text-xs text-foreground/80 transition hover:bg-accent hover:text-foreground"
      aria-label={`${phaseLabel(state.phase)} timer ${statusText}`}
      title={`${phaseLabel(state.phase)} · ${statusText}`}
    >
      <Timer className="size-3.5" />
      <span className="font-mono tabular-nums">{statusText}</span>
    </Link>
  );
}

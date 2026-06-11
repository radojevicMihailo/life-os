"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { usePomodoro, phaseLabel } from "@/lib/pomodoro/context";

export function PomodoroBadge() {
  const { state, remainingLabel } = usePomodoro();
  if (state.status === "idle") return null;

  const statusText =
    state.status === "ended"
      ? "Ended"
      : state.status === "paused"
        ? "Paused"
        : remainingLabel;

  return (
    <Link
      href="/pomodoro"
      className="mx-3 mb-2 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-foreground/80 transition hover:bg-accent hover:text-foreground"
      aria-label="Pomodoro timer"
    >
      <Timer className="h-4 w-4" />
      <span className="flex-1 truncate">{phaseLabel(state.phase)}</span>
      <span className="font-mono text-xs">{statusText}</span>
    </Link>
  );
}

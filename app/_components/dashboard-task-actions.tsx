"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CalendarClock, Square } from "lucide-react";
import { setTaskStatus, updateTask } from "@/app/(tasks)/_actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardTaskActions({ id, title, actionAt, actionEndAt, children }: { id: string; title: string; actionAt: string | null; actionEndAt: string | null; children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Izmena nije sačuvana.");
    } catch { setError("Izmena nije sačuvana. Proveri vezu i pokušaj ponovo."); }
  }
  return <div className="relative">
    <div className="flex items-center gap-2 pr-11">
      <Button size="icon" variant="ghost" disabled={pending} className="size-11 shrink-0 text-primary" title="Završi zadatak" aria-label={`Završi zadatak: ${title}`} onClick={() => startTransition(() => run(() => setTaskStatus(id, "done")))}><Square aria-hidden className="size-5" /></Button>
      <div className="min-w-0 flex-1 py-1.5">{children}</div>
    </div>
    <details className="text-xs">
      <summary aria-label={`Pomeri termin: ${title}`} title="Pomeri termin" className="absolute end-0 top-0 flex size-11 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <CalendarClock aria-hidden className="size-4" />
      </summary>
      <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get("start") ?? "");
        if (!value) return;
        const next = new Date(value);
        const duration = actionAt && actionEndAt ? Math.max(0, new Date(actionEndAt).getTime() - new Date(actionAt).getTime()) : null;
        startTransition(() => run(() => updateTask({ id, actionAt: next, actionEndAt: duration === null ? null : new Date(next.getTime() + duration) })));
      }}>
        <label className="min-w-0 space-y-1">Novi termin <span className="text-muted-foreground">(lokalno vreme)</span><Input aria-label={`Novi termin: ${title}`} type="datetime-local" name="start" required disabled={pending} className="mt-1 w-auto max-w-full" /></label>
        <Button size="sm" disabled={pending}>Sačuvaj</Button>
      </form>
    </details>
    {pending && <p role="status" className="text-xs text-muted-foreground">Čuvanje…</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}

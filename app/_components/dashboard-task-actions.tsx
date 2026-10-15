"use client";

import { useState, useTransition } from "react";
import { setTaskStatus, updateTask } from "@/app/(tasks)/_actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardTaskActions({ id, title, actionAt, actionEndAt }: { id: string; title: string; actionAt: string | null; actionEndAt: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Izmena nije sačuvana.");
    } catch { setError("Izmena nije sačuvana. Proveri vezu i pokušaj ponovo."); }
  }
  return <div className="mt-3 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} aria-label={`Završi zadatak: ${title}`} onClick={() => startTransition(() => run(() => setTaskStatus(id, "done")))}>Završi</Button>
      <details className="text-xs">
        <summary className="cursor-pointer rounded-md px-2 py-2 text-primary focus-visible:outline-2 focus-visible:outline-ring">Pomeri termin</summary>
        <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get("start") ?? "");
          if (!value) return;
          const next = new Date(value);
          const duration = actionAt && actionEndAt ? Math.max(0, new Date(actionEndAt).getTime() - new Date(actionAt).getTime()) : null;
          startTransition(() => run(() => updateTask({ id, actionAt: next, actionEndAt: duration === null ? null : new Date(next.getTime() + duration) })));
        }}>
          <label className="space-y-1">Novi termin <span className="text-muted-foreground">(lokalno vreme)</span><Input aria-label={`Novi termin: ${title}`} type="datetime-local" name="start" required disabled={pending} className="mt-1 w-auto" /></label>
          <Button size="sm" disabled={pending}>Sačuvaj</Button>
        </form>
      </details>
    </div>
    {pending && <p role="status" className="text-xs text-muted-foreground">Čuvanje…</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}

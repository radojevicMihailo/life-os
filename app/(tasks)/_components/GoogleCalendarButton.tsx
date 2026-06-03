"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listGoogleCalendarsAction,
  saveSelectedGoogleCalendarsAction,
} from "../_actions/google";

type CalInfo = { id: string; summary: string; primary: boolean };

type LoadedState = {
  status: "idle" | "loading" | "ready" | "disconnected";
  calendars: CalInfo[];
  selected: Set<string>;
};

export function GoogleCalendarButton({ initialConnected }: { initialConnected: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<LoadedState>({
    status: initialConnected ? "idle" : "disconnected",
    calendars: [],
    selected: new Set(),
  });

  async function onToggle() {
    const next = !open;
    setOpen(next);
    if (next && state.status === "idle") {
      setState((s) => ({ ...s, status: "loading" }));
      const res = await listGoogleCalendarsAction();
      if (!res.connected) {
        setState({ status: "disconnected", calendars: [], selected: new Set() });
        return;
      }
      setState({
        status: "ready",
        calendars: res.calendars,
        selected: new Set(res.selected),
      });
    }
  }

  function toggleId(id: string) {
    setState((s) => {
      const next = new Set(s.selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, selected: next };
    });
  }

  function save() {
    const ids = Array.from(state.selected);
    startTransition(async () => {
      try {
        await saveSelectedGoogleCalendarsAction(ids);
        toast.success("Calendar selection saved");
        setOpen(false);
      } catch {
        toast.error("Could not save selection");
      }
    });
  }

  if (state.status === "disconnected") {
    return (
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          Connect Google Calendar
        </Button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-popover p-3 text-sm shadow">
            <p className="font-medium">Connect Google Calendar</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                Create an OAuth Client (Web app) in Google Cloud Console with redirect URI
                <code className="ml-1">http://localhost:3000/oauth2callback</code>.
              </li>
              <li>
                Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to{" "}
                <code>.env.local</code>.
              </li>
              <li>
                Run <code>pnpm google:oauth</code> and paste the printed{" "}
                <code>GOOGLE_REFRESH_TOKEN</code> into <code>.env.local</code>.
              </li>
              <li>Restart the dev server and refresh this page.</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  const label =
    state.status === "ready"
      ? `Google Calendar (${state.selected.size})`
      : "Google Calendar";

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={onToggle} disabled={pending}>
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-popover p-3 text-sm shadow">
          {state.status === "loading" && <p>Loading calendars…</p>}
          {state.status === "ready" && (
            <>
              <p className="mb-2 font-medium">Show events from</p>
              <ul className="max-h-64 space-y-1 overflow-auto">
                {state.calendars.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <input
                      id={`gcal-${c.id}`}
                      type="checkbox"
                      checked={state.selected.has(c.id)}
                      onChange={() => toggleId(c.id)}
                    />
                    <label htmlFor={`gcal-${c.id}`} className="truncate">
                      {c.summary} {c.primary ? "(primary)" : ""}
                    </label>
                  </li>
                ))}
                {state.calendars.length === 0 && (
                  <li className="text-muted-foreground">No calendars returned.</li>
                )}
              </ul>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={pending}>
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

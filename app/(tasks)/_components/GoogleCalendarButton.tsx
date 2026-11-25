"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listGoogleCalendarsAction,
  saveSelectedGoogleCalendarsAction,
} from "../_actions/google";

type CalInfo = {
  id: string;
  summary: string;
  primary: boolean;
  accountIdx: number;
  accountLabel: string;
};

type LoadedState = {
  status: "idle" | "loading" | "ready" | "disconnected";
  calendars: CalInfo[];
  selected: Set<string>;
};

function compositeId(accountIdx: number, calendarId: string) {
  return `${accountIdx}:${calendarId}`;
}

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
        toast.success("Izbor kalendara je sačuvan");
        setOpen(false);
      } catch {
        toast.error("Izbor kalendara nije sačuvan");
      }
    });
  }

  const grouped = useMemo(() => {
    const m = new Map<number, { label: string; cals: CalInfo[] }>();
    for (const c of state.calendars) {
      const g = m.get(c.accountIdx) ?? { label: c.accountLabel, cals: [] };
      g.cals.push(c);
      m.set(c.accountIdx, g);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [state.calendars]);

  if (state.status === "disconnected") {
    return (
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          Poveži Google kalendar
        </Button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-96 rounded-md border bg-popover p-3 text-sm shadow">
            <p className="font-medium">Poveži Google kalendar</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                U Google Cloud konzoli napravi OAuth klijent za veb aplikaciju sa adresom za preusmeravanje
                <code className="ml-1">http://localhost:3000/oauth2callback</code>.
              </li>
              <li>
                Dodaj <code>GOOGLE_CLIENT_ID</code> i <code>GOOGLE_CLIENT_SECRET</code> u{" "}
                <code>.env.local</code>.
              </li>
              <li>
                Pokreni <code>pnpm google:oauth</code> jednom za svaki Google nalog i sačuvaj dobijene tokene za osvežavanje.
              </li>
              <li>
                U <code>.env.local</code> postavi <code>GOOGLE_REFRESH_TOKENS</code> na listu tih tokena razdvojenih zarezom. Za jedan nalog možeš koristiti <code>GOOGLE_REFRESH_TOKEN</code>. Po želji postavi{" "}
                <code>GOOGLE_ACCOUNT_LABELS</code> na listu naziva naloga, istim redosledom i razdvojenu zarezom.
              </li>
              <li>Restartuj razvojni server i osveži stranicu.</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  const label =
    state.status === "ready"
      ? `Google kalendar (${state.selected.size})`
      : "Google kalendar";

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={onToggle} disabled={pending}>
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-96 rounded-md border bg-popover p-3 text-sm shadow">
          {state.status === "loading" && <p>Učitavanje kalendara…</p>}
          {state.status === "ready" && (
            <>
              <p className="mb-2 font-medium">Prikaži događaje iz kalendara</p>
              <div className="max-h-72 space-y-3 overflow-auto">
                {grouped.map(([idx, group]) => (
                  <div key={idx}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <ul className="space-y-1">
                      {group.cals.map((c) => {
                        const cid = compositeId(c.accountIdx, c.id);
                        return (
                          <li key={cid} className="flex items-center gap-2">
                            <input
                              id={`gcal-${cid}`}
                              type="checkbox"
                              checked={state.selected.has(cid)}
                              onChange={() => toggleId(cid)}
                            />
                            <label htmlFor={`gcal-${cid}`} className="truncate">
                              {c.summary} {c.primary ? "(glavni)" : ""}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {state.calendars.length === 0 && (
                  <p className="text-muted-foreground">Nema dostupnih kalendara.</p>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Otkaži
                </Button>
                <Button size="sm" onClick={save} disabled={pending}>
                  Sačuvaj
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

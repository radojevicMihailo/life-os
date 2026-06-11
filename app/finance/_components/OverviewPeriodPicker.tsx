"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function thisMonth(today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}

function lastMonth(today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const py = prev.getUTCFullYear();
  const pm = prev.getUTCMonth();
  const last = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
  return { from: `${py}-${pad(pm + 1)}-01`, to: `${py}-${pad(pm + 1)}-${pad(last)}` };
}

function ytd(today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  return { from: `${y}-01-01`, to: today.toISOString().slice(0, 10) };
}

export function OverviewPeriodPicker({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [pending, startTransition] = useTransition();

  function push(nextFrom: string, nextTo: string) {
    const [f, t] = nextFrom <= nextTo ? [nextFrom, nextTo] : [nextTo, nextFrom];
    const params = new URLSearchParams(search.toString());
    params.set("from", f);
    params.set("to", t);
    startTransition(() => {
      router.replace(`/finance/overview?${params.toString()}`);
    });
  }

  function applyPreset(p: { from: string; to: string }) {
    setFrom(p.from);
    setTo(p.to);
    push(p.from, p.to);
  }

  const today = new Date();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => applyPreset(thisMonth(today))}>
          Ovaj mesec
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset(lastMonth(today))}>
          Prošli mesec
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset(ytd(today))}>
          YTD
        </Button>
      </div>
      <div className="flex items-end gap-2">
        <label className="text-xs text-muted-foreground flex flex-col">
          Od
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground flex flex-col">
          Do
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
        </label>
        <Button size="sm" onClick={() => push(from, to)} disabled={pending}>
          Primeni
        </Button>
      </div>
      <div className="ml-auto text-sm text-muted-foreground">Valuta: EUR</div>
    </div>
  );
}

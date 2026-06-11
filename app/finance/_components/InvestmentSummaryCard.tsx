"use client";

import { useEffect, useReducer } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInvestmentSummary } from "../_actions/overview";
import { fmtEur, fmtPct } from "@/lib/finance/overview/formatters";
import type { InvestmentSummary } from "@/lib/finance/overview/types";

type State =
  | { status: "loading" }
  | { status: "success"; data: InvestmentSummary }
  | { status: "error"; message: string };

type Action =
  | { type: "fetch" }
  | { type: "success"; data: InvestmentSummary }
  | { type: "error"; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "fetch":
      return { status: "loading" };
    case "success":
      return { status: "success", data: action.data };
    case "error":
      return { status: "error", message: action.message };
  }
}

export function InvestmentSummaryCard({ from, to }: { from: string; to: string }) {
  const [state, dispatch] = useReducer(reducer, { status: "loading" } as State);
  const [attempt, setAttempt] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "fetch" });
    getInvestmentSummary(from, to)
      .then((res) => {
        if (!cancelled) dispatch({ type: "success", data: res });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          dispatch({
            type: "error",
            message: e instanceof Error ? e.message : "Greška",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, attempt]);

  if (state.status === "loading") {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">Investicije</div>
        <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">Investicije</div>
        <div className="text-sm text-rose-600">Greška: {state.message}</div>
        <Button size="sm" variant="outline" onClick={() => setAttempt()}>
          Pokušaj ponovo
        </Button>
      </Card>
    );
  }

  const data = state.data;
  const pnlColor = data.pnlAbsolute >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Investicije</div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Uloženo u periodu</div>
          <div className="text-lg tabular-nums">{fmtEur(data.investedInWindow)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Trenutna vrednost</div>
          <div className="text-lg tabular-nums">{fmtEur(data.currentValue)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground">Nerealizovani P/L</div>
          <div className={`text-lg tabular-nums ${pnlColor}`}>
            {fmtEur(data.pnlAbsolute)} ({fmtPct(data.pnlPercent)})
          </div>
        </div>
      </div>
    </Card>
  );
}

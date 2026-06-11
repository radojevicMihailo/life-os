"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInvestmentSummary } from "../_actions/overview";
import { fmtEur, fmtPct } from "@/lib/finance/overview/formatters";
import type { InvestmentSummary } from "@/lib/finance/overview/types";

export function InvestmentSummaryCard({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<InvestmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInvestmentSummary(from, to)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Greška");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, attempt]);

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">Investicije</div>
        <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">Investicije</div>
        <div className="text-sm text-rose-600">Greška: {error}</div>
        <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}>
          Pokušaj ponovo
        </Button>
      </Card>
    );
  }

  if (!data) return null;

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

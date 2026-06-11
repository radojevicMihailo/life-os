import { Card } from "@/components/ui/card";
import { fmtEur, fmtPct } from "@/lib/finance/overview/formatters";

export function KpiCard({
  label,
  value,
  delta,
  favorable,
}: {
  label: string;
  value: number;
  delta: { pct: number | null; sign: -1 | 0 | 1 };
  favorable: "positive" | "negative";
}) {
  let color = "text-muted-foreground";
  if (delta.pct != null && delta.sign !== 0) {
    const good = favorable === "positive" ? delta.sign === 1 : delta.sign === -1;
    color = good ? "text-emerald-600" : "text-rose-600";
  }

  return (
    <Card className="p-4 space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{fmtEur(value)}</div>
      <div className={`text-xs tabular-nums ${color}`}>
        {delta.pct == null ? "—" : `${fmtPct(delta.pct)} vs prethodni period`}
      </div>
    </Card>
  );
}

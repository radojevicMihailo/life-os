"use client";

import {
  Bar,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Legend,
} from "recharts";
import type { CashflowBucket, Granularity } from "@/lib/finance/overview/types";

export function CashflowChart({
  buckets,
  granularity,
}: {
  buckets: CashflowBucket[];
  granularity: Granularity;
}) {
  if (buckets.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">Nema podataka</div>
    );
  }
  const data = buckets.map((b) => ({
    bucket: b.bucket,
    income: Number(b.income.toFixed(2)),
    expense: Number(b.expense.toFixed(2)),
    net: Number((b.income - b.expense).toFixed(2)),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value) || 0;
              return num.toLocaleString("sr-RS", { maximumFractionDigits: 2 });
            }}
          />
          <Legend />
          <Bar dataKey="income" name="Prihod" fill="#10b981" />
          <Bar dataKey="expense" name="Trošak" fill="#ef4444" />
          <Line dataKey="net" name="Neto" stroke="#3b82f6" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-muted-foreground text-right">
        granularity: {granularity}
      </div>
    </div>
  );
}

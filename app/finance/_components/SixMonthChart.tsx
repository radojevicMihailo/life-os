"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SixMonthBar } from "@/lib/finance/overview/types";

export function SixMonthChart({ data }: { data: SixMonthBar[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Nema podataka</div>;
  }
  const shaped = data.map((d) => ({
    month: d.month,
    income: Number(d.income.toFixed(2)),
    expense: Number(d.expense.toFixed(2)),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={shaped} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
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
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

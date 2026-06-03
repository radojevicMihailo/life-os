"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { GroupTotal } from "@/lib/finance/aggregations";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];

function fmtEur(n: number): string {
  return n.toLocaleString("sr-RS", { maximumFractionDigits: 0 });
}

export function PortfolioChart({ groupTotals }: { groupTotals: GroupTotal[] }) {
  if (groupTotals.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Nema podataka za prikaz.
      </div>
    );
  }

  const total = groupTotals.reduce((s, g) => s + g.eur, 0);
  const data = groupTotals.map((g, i) => ({
    name: g.name,
    value: g.eur,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={1}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const num = typeof value === "number" ? value : Number(value) || 0;
              return [
                `${fmtEur(num)} EUR (${total > 0 ? ((num / total) * 100).toFixed(1) : "0.0"}%)`,
                String(name),
              ];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

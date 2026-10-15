"use client";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { FinancialDetail } from "@/modules/finance/ui/components/finance-privacy";
export function MonthlyChart({ points }: {
    points: {
        month: string;
        netWorthEur: string | null;
    }[];
}) {
    return <FinancialDetail><div className="h-64 min-w-0" role="img" aria-label="Neto imovina kroz mesece; ista istorija dostupna je u tabeli ispod."><ResponsiveContainer width="100%" height="100%"><LineChart data={points.map(p => ({ month: p.month, value: p.netWorthEur === null ? null : Number(p.netWorthEur) }))}><CartesianGrid stroke="var(--border)"/><XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}/><YAxis width={65} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}/><Tooltip formatter={value => [`${Number(value).toLocaleString("sr-Latn-RS")} EUR`, "Neto imovina"]} contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 12 }}/><Line dataKey="value" stroke="var(--primary)" strokeWidth={2} connectNulls={false}/></LineChart></ResponsiveContainer></div></FinancialDetail>;
}

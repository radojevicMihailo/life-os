"use client";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { FinancialDetail } from "@/modules/finance/ui/components/finance-privacy";
export function MonthlyChart({ points }: {
    points: {
        month: string;
        netWorthEur: string | null;
    }[];
}) {
    return <FinancialDetail><div className="h-64 min-w-0" role="img" aria-label="Neto imovina kroz mesece; ista istorija dostupna je u tabeli ispod."><ResponsiveContainer width="100%" height="100%"><LineChart data={points.map(p => ({ month: p.month, value: p.netWorthEur === null ? null : Number(p.netWorthEur) }))}><CartesianGrid stroke="#ffffff15"/><XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis width={65} tick={{ fill: "#94a3b8", fontSize: 11 }}/><Tooltip formatter={value => [`${Number(value).toLocaleString("sr-Latn-RS")} EUR`, "Neto imovina"]} contentStyle={{ background: "#0f172a", border: "1px solid #ffffff22", borderRadius: 12 }}/><Line dataKey="value" stroke="#60a5fa" strokeWidth={2} connectNulls={false}/></LineChart></ResponsiveContainer></div></FinancialDetail>;
}

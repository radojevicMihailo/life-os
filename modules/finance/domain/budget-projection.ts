import Decimal from "decimal.js";
const D = Decimal.clone({ precision: 80 });
export type BudgetAlert = "overspent" | "near_limit" | "forecast_over" | "ahead_of_pace" | "no_capacity";
export function projectBudget(input: {
    available: string;
    spent: string;
    pending: string;
    elapsedDays: number;
    totalDays: number;
    period: "past" | "current" | "future";
}) {
    const available = new D(input.available), spent = new D(input.spent), elapsed = new D(Math.max(0, input.elapsedDays)).div(input.totalDays).times(100);
    const used = available.gt(0) ? spent.div(available).times(100) : null;
    const projected = input.period === "future" ? null : input.period === "past" ? spent : D.max(spent.times(input.totalDays).div(Math.max(1, input.elapsedDays)), spent.plus(input.pending));
    const alerts: BudgetAlert[] = [];
    if (available.lte(0))
        alerts.push("no_capacity");
    if (spent.gt(available))
        alerts.push("overspent");
    else if (used?.gte(80))
        alerts.push("near_limit");
    if (input.period === "current") {
        if (projected?.gt(available))
            alerts.push("forecast_over");
        if (used?.minus(elapsed).gte(10))
            alerts.push("ahead_of_pace");
    }
    return { projected: projected?.toFixed() ?? null, usedPercent: used?.toFixed() ?? null, elapsedPercent: elapsed.toFixed(), alerts };
}

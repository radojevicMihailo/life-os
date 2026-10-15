import Decimal from "decimal.js";
import { calendarDate } from "./calendar";
const D = Decimal.clone({ precision: 80 });
export function calculateGoalPlan(input: {
    targetAmount: string;
    fundedCash: string | null;
    receivables: string | null;
    targetDate: string | null;
    today: string;
    minorUnit: number;
}) {
    const remaining = input.fundedCash === null ? null : D.max(new D(input.targetAmount).minus(input.fundedCash), 0);
    const months = input.targetDate ? (Number(input.targetDate.slice(0, 4)) - Number(input.today.slice(0, 4))) * 12 + Number(input.targetDate.slice(5, 7)) - Number(input.today.slice(5, 7)) + 1 : null;
    if (input.targetDate)
        calendarDate(input.targetDate);
    const status = remaining?.isZero() ? "funded" : !input.targetDate ? "no_deadline" : input.targetDate < input.today ? "overdue" : "active";
    return { remaining: remaining?.toFixed() ?? null, monthly: status === "funded" ? "0" : status === "active" && remaining ? remaining.div(Math.max(1, months!)).toDecimalPlaces(input.minorUnit, Decimal.ROUND_CEIL).toFixed() : null, months, status, conditionalReceivables: input.receivables };
}

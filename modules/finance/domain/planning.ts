import { addDays, calendarDate, daysBetween, monthLength } from "./calendar";
export type Frequency = "once" | "weekly" | "monthly" | "yearly";
export interface PlanRule {
    id: string;
    name: string;
    type: "income" | "expense";
    accountId: string;
    categoryId: string;
    amount: string;
    startDate: string;
    endDate: string | null;
    frequency: Frequency;
    isPrimaryIncome: boolean;
    archivedAt: Date | null;
}
export interface PlannedOccurrence {
    ruleId: string;
    dueDate: string;
    name: string;
    type: "income" | "expense";
    accountId: string;
    categoryId: string;
    amount: string;
    currencyCode: string;
    isPrimaryIncome: boolean;
    status: "pending" | "confirmed" | "skipped";
    journalTransactionId: string | null;
    overdue: boolean;
    accountName: string;
    categoryName: string;
}
export function expandOccurrences(rule: PlanRule, from: string, to: string): {
    ruleId: string;
    dueDate: string;
}[] {
    calendarDate(from);
    calendarDate(to);
    calendarDate(rule.startDate);
    if (from > to || rule.startDate > to || (rule.endDate && rule.endDate < from))
        return [];
    if (daysBetween(from, to) > 366)
        throw new RangeError("Prikaži najviše 12 meseci odjednom.");
    const end = rule.endDate && rule.endDate < to ? rule.endDate : to;
    const start = rule.startDate > from ? rule.startDate : from;
    const dates: string[] = [];
    if (rule.frequency === "once") {
        if (rule.startDate >= from && rule.startDate <= end)
            dates.push(rule.startDate);
    }
    else if (rule.frequency === "weekly") {
        let date = addDays(rule.startDate, Math.max(0, Math.ceil(daysBetween(rule.startDate, start) / 7)) * 7);
        while (date <= end) {
            dates.push(date);
            date = addDays(date, 7);
        }
    }
    else {
        const anchorYear = Number(rule.startDate.slice(0, 4)), anchorMonth = Number(rule.startDate.slice(5, 7)), day = Number(rule.startDate.slice(8));
        const step = rule.frequency === "yearly" ? 12 : 1;
        const difference = (Number(start.slice(0, 4)) - anchorYear) * 12 + Number(start.slice(5, 7)) - anchorMonth;
        for (let n = Math.max(0, Math.floor(difference / step));; n++) {
            const monthIndex = anchorYear * 12 + anchorMonth - 1 + n * step, year = Math.floor(monthIndex / 12), month = monthIndex % 12 + 1;
            if (year > 2100)
                break;
            const first = `${year}-${String(month).padStart(2, "0")}-01`;
            const date = `${first.slice(0, 8)}${String(Math.min(day, monthLength(first))).padStart(2, "0")}`;
            if (date > end)
                break;
            if (date >= start)
                dates.push(date);
        }
    }
    return dates.map(dueDate => ({ ruleId: rule.id, dueDate }));
}
/** Full overdue sums use bounded calendar chunks, independent of list pagination. */
export function expandAllOccurrences(rule: PlanRule, from: string, to: string) {
    const result: {
        ruleId: string;
        dueDate: string;
    }[] = [];
    let date = rule.startDate > from ? rule.startDate : from;
    while (date <= to) {
        const end = addDays(date, 365);
        result.push(...expandOccurrences(rule, date, end < to ? end : to));
        if (end >= to)
            break;
        date = addDays(end, 1);
    }
    return result;
}

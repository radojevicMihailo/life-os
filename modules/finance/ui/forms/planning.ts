import { z } from "zod";
import { isCalendarDate, daysBetween } from "../../domain/calendar";
import { formRecord, identifier, requiredText, serbianDecimal, optionalText, belgradeDateTime } from "./common";
const date = z.string().refine(isCalendarDate, "Unesite ispravan datum.");
export function parsePlanForm(input: FormData | Record<string, unknown>) {
    const raw = formRecord(input);
    return z.object({ id: identifier.optional(), name: requiredText, type: z.enum(["income", "expense"]), accountId: identifier, categoryId: identifier, amount: serbianDecimal(), startDate: date, endDate: date.nullable(), frequency: z.enum(["once", "weekly", "monthly", "yearly"]), isPrimaryIncome: z.boolean() }).parse({ ...raw, id: optionalText(raw.id), endDate: optionalText(raw.endDate) ?? null, isPrimaryIncome: raw.isPrimaryIncome === "on" || raw.isPrimaryIncome === true });
}
export function parseOccurrenceForm(input: FormData | Record<string, unknown>) { return z.object({ ruleId: identifier, dueDate: date }).parse(formRecord(input)); }
export function parseConfirmationForm(input: FormData | Record<string, unknown>) { return z.object({ ruleId: identifier, dueDate: date, amount: serbianDecimal(), occurredAt: belgradeDateTime("Unesite datum plaćanja.").pipe(z.date()) }).parse(formRecord(input)); }
export function parsePlanningHorizon(value: unknown, today: string): {
    endDate: string | undefined;
    error: string | null;
} {
    if (value === undefined || value === "")
        return { endDate: undefined, error: null };
    if (!isCalendarDate(value) || value < today || daysBetween(today, value) > 366)
        return { endDate: undefined, error: "Izaberi datum od danas do najviše 12 meseci unapred." };
    return { endDate: value, error: null };
}

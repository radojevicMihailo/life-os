import Decimal from "decimal.js";
import { z } from "zod";

export const requiredText = z.string().trim().min(1).max(500);
export const identifier = z.string().trim().min(1).max(200);
export const currencyCode = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);

export function formValidationError(fields: Record<string, string>): never {
  throw new z.ZodError(Object.entries(fields).map(([field, message]) => ({
    code: "custom" as const,
    message,
    path: [field],
  })));
}

export function parseField<T>(field: string, schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new z.ZodError(parsed.error.issues.map((issue) => ({
    ...issue,
    path: [field, ...issue.path],
  })));
}

export function normalizeSerbianDecimal(value: unknown, options?: { allowZero?: boolean }) {
  const raw = String(value ?? "").trim().replaceAll(" ", "");
  if (!raw) throw new Error("amount_required");
  const normalized = raw.includes(",")
    ? raw.replaceAll(".", "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/.test(raw)
      ? raw.replaceAll(".", "")
      : raw;
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error("amount_invalid");
  const decimal = new Decimal(normalized);
  if (options?.allowZero ? decimal.isNegative() : !decimal.isPositive()) {
    throw new Error("amount_non_positive");
  }
  return decimal.toFixed(decimal.decimalPlaces());
}

export function normalizeSerbianDecimalField(
  field: string,
  value: unknown,
  options?: { allowZero?: boolean },
) {
  try {
    return normalizeSerbianDecimal(value, options);
  } catch {
    return formValidationError({ [field]: options?.allowZero ? "Unesite nulu ili pozitivan iznos." : "Unesite pozitivan iznos." });
  }
}

export function serbianDecimal(options?: { allowZero?: boolean }) {
  return z.unknown().transform((value, context) => {
    try {
      return normalizeSerbianDecimal(value, options);
    } catch {
      context.addIssue({
        code: "custom",
        message: options?.allowZero ? "Unesite nulu ili pozitivan iznos." : "Unesite pozitivan iznos.",
      });
      return z.NEVER;
    }
  });
}

export function optionalText(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function offsetMilliseconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  ) - date.getTime();
}

export function parseBelgradeDateTime(value: unknown) {
  const raw = optionalText(value);
  if (!raw) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(raw);
  if (!match) throw new Error("date_invalid");
  const [, year, month, day, hour = "00", minute = "00"] = match;
  const wallClockUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  let instant = new Date(wallClockUtc);
  instant = new Date(wallClockUtc - offsetMilliseconds(instant, "Europe/Belgrade"));
  if (Number.isNaN(instant.getTime())) throw new Error("date_invalid");
  return instant;
}

export function belgradeDateTime(requiredMessage?: string) {
  return z.unknown().transform((value, context) => {
    if (!optionalText(value)) {
      if (requiredMessage) {
        context.addIssue({ code: "custom", message: requiredMessage });
        return z.NEVER;
      }
      return undefined;
    }
    try {
      return parseBelgradeDateTime(value);
    } catch {
      context.addIssue({ code: "custom", message: "Unesite ispravan datum i vreme." });
      return z.NEVER;
    }
  });
}

export function formRecord(formData: FormData | Record<string, unknown>) {
  return formData instanceof FormData ? Object.fromEntries(formData) : formData;
}

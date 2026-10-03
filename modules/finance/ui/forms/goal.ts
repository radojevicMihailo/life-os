import Decimal from "decimal.js";
import { z } from "zod";

import { currencyCode, formRecord, identifier, optionalText, parseField, requiredText, serbianDecimal } from "./common";

const goalFormSchema = z.object({
  id: z.unknown().optional(),
  name: requiredText,
  targetCurrencyCode: currencyCode,
  targetAmount: serbianDecimal().refine((value) => new Decimal(value).gt(0), "Unesite pozitivan iznos."),
});

export function parseGoalForm(input: FormData | Record<string, unknown>) {
  const raw = goalFormSchema.parse(formRecord(input));
  return {
    ...(optionalText(raw.id) ? { id: parseField("id", identifier, raw.id) } : {}),
    name: raw.name,
    targetCurrencyCode: raw.targetCurrencyCode,
    targetAmount: raw.targetAmount,
  };
}

export function parseArchiveGoalForm(input: FormData | Record<string, unknown>) {
  return z.object({ id: identifier }).parse(formRecord(input));
}

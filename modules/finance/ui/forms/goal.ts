import { z } from "zod";

import { currencyCode, formRecord, identifier, optionalText, parseField, requiredText, serbianDecimal } from "./common";

const goalFormSchema = z.object({
  id: z.unknown().optional(),
  name: requiredText,
  accountId: identifier,
  targetCurrencyCode: currencyCode,
  targetAmount: serbianDecimal(),
});

export function parseGoalForm(input: FormData | Record<string, unknown>) {
  const raw = goalFormSchema.parse(formRecord(input));
  return {
    ...(optionalText(raw.id) ? { id: parseField("id", identifier, raw.id) } : {}),
    name: raw.name,
    accountId: raw.accountId,
    targetCurrencyCode: raw.targetCurrencyCode,
    targetAmount: raw.targetAmount,
  };
}

export function parseArchiveGoalForm(input: FormData | Record<string, unknown>) {
  return z.object({ id: identifier }).parse(formRecord(input));
}

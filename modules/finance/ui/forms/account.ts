import { z } from "zod";

import { currencyCode, formRecord, identifier, requiredText } from "./common";

export function parseAccountForm(input: FormData | Record<string, unknown>) {
  return z.object({
    name: requiredText,
    classification: z.enum(["asset", "liability", "receivable"]),
    subtype: requiredText,
    currencyCode,
  }).parse(formRecord(input));
}

export function parseArchiveAccountForm(input: FormData | Record<string, unknown>) {
  return z.object({ id: identifier }).parse(formRecord(input));
}

export function parseActivateCurrencyForm(input: FormData | Record<string, unknown>) {
  return z.object({ currencyCode }).parse(formRecord(input));
}

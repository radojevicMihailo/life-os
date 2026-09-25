import { z } from "zod";

import { currencyCode, formRecord, identifier, serbianDecimal } from "./common";

const budgetFormSchema = z.object({
  categoryId: identifier,
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Izaberite ispravan mesec."),
  currencyCode,
  amount: serbianDecimal(),
});

export function parseBudgetForm(input: FormData | Record<string, unknown>) {
  return budgetFormSchema.parse(formRecord(input));
}

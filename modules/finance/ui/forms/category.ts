import { z } from "zod";

import { formRecord, identifier, requiredText } from "./common";

export function parseCategoryForm(input: FormData | Record<string, unknown>) {
  return z.object({
    name: requiredText,
    classification: z.enum(["income", "expense"]),
  }).parse(formRecord(input));
}

export function parseArchiveCategoryForm(input: FormData | Record<string, unknown>) {
  return z.object({ id: identifier }).parse(formRecord(input));
}

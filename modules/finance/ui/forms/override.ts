import { z } from "zod";

import { currencyCode, formRecord, identifier, serbianDecimal } from "./common";

const overrideFormSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("exchange_rate"),
    baseCurrencyCode: currencyCode,
    quoteCurrencyCode: currencyCode,
    value: serbianDecimal(),
  }),
  z.object({
    kind: z.literal("market_quote"),
    instrumentId: identifier,
    quoteCurrencyCode: currencyCode,
    value: serbianDecimal(),
  }),
]);

export function parseOverrideForm(input: FormData | Record<string, unknown>) {
  return overrideFormSchema.parse(formRecord(input));
}

export function parseClearOverrideForm(input: FormData | Record<string, unknown>) {
  const parsed = parseOverrideForm({ ...formRecord(input), value: "1" });
  return parsed.kind === "exchange_rate"
    ? {
        kind: parsed.kind,
        baseCurrencyCode: parsed.baseCurrencyCode,
        quoteCurrencyCode: parsed.quoteCurrencyCode,
      }
    : {
        kind: parsed.kind,
        instrumentId: parsed.instrumentId,
        quoteCurrencyCode: parsed.quoteCurrencyCode,
      };
}

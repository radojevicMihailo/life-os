import { z } from "zod";

import { belgradeDateTime, currencyCode, formRecord, identifier, normalizeSerbianDecimal, normalizeSerbianDecimalField, optionalText, parseField, requiredText } from "./common";

const investmentAccountSchema = z.object({
  name: requiredText,
  cashAccountId: identifier,
  provider: z.unknown().optional(),
});

const openingLotFacts = z.object({
  investmentAccountId: identifier,
  instrumentId: identifier,
  quantity: z.string().trim().min(1, "Količina je obavezna."),
  acquiredAt: belgradeDateTime("Datum sticanja je obavezan."),
  price: z.string().trim().min(1, "Cena sticanja je obavezna."),
  currencyCode,
  fees: z.string().trim().min(1, "Naknada je obavezna; unesite 0 ako je nema."),
  tradeFxRateToEur: z.string().trim().min(1, "Kurs prema EUR je obavezan."),
});

const activityFacts = z.object({
  operation: z.enum(["buy", "sell", "dividend", "fee"]),
  investmentAccountId: identifier,
  instrumentId: identifier,
  quantity: z.unknown().optional(),
  amount: z.unknown().optional(),
  fees: z.unknown().optional(),
  tradeCurrencyCode: currencyCode.default("EUR"),
  tradeFxRateToEur: z.unknown().optional(),
  occurredAt: belgradeDateTime().optional(),
  description: z.unknown().optional(),
}).superRefine((raw, context) => {
  if ((raw.operation === "buy" || raw.operation === "sell") && !optionalText(raw.quantity)) {
    context.addIssue({ code: "custom", message: "Količina je obavezna.", path: ["quantity"] });
  }
  if (!optionalText(raw.amount)) context.addIssue({ code: "custom", message: "Iznos je obavezan.", path: ["amount"] });
  if (!optionalText(raw.tradeFxRateToEur)) context.addIssue({ code: "custom", message: "Kurs prema EUR je obavezan.", path: ["tradeFxRateToEur"] });
  for (const [field, value, allowZero] of [
    ["quantity", raw.quantity, false],
    ["amount", raw.amount, false],
    ["fees", raw.fees ?? "0", true],
    ["tradeFxRateToEur", raw.tradeFxRateToEur, false],
  ] as const) {
    if (!optionalText(value)) continue;
    try {
      normalizeSerbianDecimal(value, { allowZero });
    } catch {
      context.addIssue({ code: "custom", message: "Unesite ispravnu pozitivnu decimalnu vrednost.", path: [field] });
    }
  }
});

const instrumentResolutionSchema = z.object({
  symbol: requiredText.transform((value) => value.toUpperCase()),
  name: requiredText,
  class: z.enum(["stock", "etf", "crypto"]),
  quoteCurrencyCode: currencyCode,
  provider: z.enum(["alpha_vantage", "coingecko"]),
  providerId: z.unknown().optional(),
  isin: z.unknown().optional(),
  exchange: z.unknown().optional(),
});

export function parseInvestmentAccountForm(input: FormData | Record<string, unknown>) {
  const raw = investmentAccountSchema.parse(formRecord(input));
  return {
    name: raw.name,
    cashAccountId: raw.cashAccountId,
    ...(optionalText(raw.provider) ? { provider: optionalText(raw.provider) } : {}),
  };
}

export function parseOpeningLotForm(input: FormData | Record<string, unknown>) {
  const raw = formRecord(input);
  const fields = [raw.quantity, raw.acquiredAt, raw.price, raw.currencyCode, raw.fees, raw.tradeFxRateToEur];
  if (fields.every((field) => !optionalText(field))) return null;
  const parsed = openingLotFacts.parse(raw);
  return {
    investmentAccountId: parsed.investmentAccountId,
    instrumentId: parsed.instrumentId,
    quantity: normalizeSerbianDecimalField("quantity", parsed.quantity),
    acquiredAt: parsed.acquiredAt as Date,
    price: normalizeSerbianDecimalField("price", parsed.price),
    currencyCode: parsed.currencyCode,
    fees: normalizeSerbianDecimalField("fees", parsed.fees, { allowZero: true }),
    tradeFxRateToEur: normalizeSerbianDecimalField("tradeFxRateToEur", parsed.tradeFxRateToEur),
  };
}

export function parseInvestmentActivityForm(input: FormData | Record<string, unknown>) {
  const raw = activityFacts.parse(formRecord(input));
  const operation = raw.operation;
  const quantity = optionalText(raw.quantity);
  const amount = optionalText(raw.amount)!;
  return {
    operation,
    investmentAccountId: parseField("investmentAccountId", identifier, raw.investmentAccountId),
    instrumentId: parseField("instrumentId", identifier, raw.instrumentId),
    ...(quantity ? { quantity: normalizeSerbianDecimalField("quantity", quantity) } : {}),
    amount: normalizeSerbianDecimalField("amount", amount),
    fees: normalizeSerbianDecimalField("fees", raw.fees ?? "0", { allowZero: true }),
    tradeCurrencyCode: raw.tradeCurrencyCode,
    tradeFxRateToEur: normalizeSerbianDecimalField("tradeFxRateToEur", raw.tradeFxRateToEur),
    ...(raw.occurredAt ? { occurredAt: raw.occurredAt } : {}),
    ...(optionalText(raw.description) ? { description: optionalText(raw.description) } : {}),
  };
}

export function parseInstrumentResolutionForm(input: FormData | Record<string, unknown>) {
  const raw = instrumentResolutionSchema.parse(formRecord(input));
  return {
    symbol: raw.symbol,
    name: raw.name,
    class: raw.class,
    quoteCurrencyCode: raw.quoteCurrencyCode,
    provider: raw.provider,
    ...(optionalText(raw.providerId) ? { providerId: optionalText(raw.providerId) } : {}),
    ...(optionalText(raw.isin) ? { isin: optionalText(raw.isin) } : {}),
    ...(optionalText(raw.exchange) ? { exchange: optionalText(raw.exchange) } : {}),
  };
}

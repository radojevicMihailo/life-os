import Decimal from "decimal.js";
import { z } from "zod";
import { formRecord, identifier, serbianDecimal } from "./common";

export function parseAccountPurposeForm(input: FormData | Record<string, unknown>) {
  const record = formRecord(input);
  const target = String(record.target ?? "");
  const split = target.indexOf(":");
  return z.object({ accountId: identifier, targetType: z.enum(["goal", "budget"]), targetId: identifier,
    amount: serbianDecimal().refine((value) => new Decimal(value).gt(0), "Unesite pozitivan iznos.") }).parse({ ...record, targetType: target.slice(0, split), targetId: target.slice(split + 1) });
}
export function parseRemoveAccountPurposeForm(input: FormData | Record<string, unknown>) {
  return z.object({ accountId: identifier, id: identifier }).parse(formRecord(input));
}

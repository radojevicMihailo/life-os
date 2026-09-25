import Decimal from "decimal.js";

import type { valueNetWorthEur } from "../application/valuation";
import type { EffectiveValuation } from "../domain/valuation";

export type NetWorthSnapshot = Awaited<ReturnType<typeof valueNetWorthEur>>;

export function canonicalDecimal(value: Decimal.Value, scale = 18) {
  return new Decimal(value)
    .toFixed(scale)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export function valuationKey(metadata: EffectiveValuation) {
  return [
    metadata.source,
    metadata.effectiveAt.toISOString(),
    metadata.value,
    metadata.manual ? "manual" : "automatic",
  ].join(":");
}

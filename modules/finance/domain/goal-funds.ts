import Decimal from "decimal.js";
import type { EffectiveValuation } from "./valuation";
const ExactDecimal = Decimal.clone({ precision: 80 });
export interface GoalFxMetadata {
  sourceToEur: EffectiveValuation | null;
  targetToEur: EffectiveValuation | null;
  stale: boolean;
  missingCurrencies: string[];
}
export function convertGoalReservation(amount: string, source: string, target: string, rates: Map<string, EffectiveValuation>) {
  const valuation: GoalFxMetadata = { sourceToEur: null, targetToEur: null, stale: false, missingCurrencies: [] };
  if (source === target) return { amount: new ExactDecimal(amount).toFixed(), valuation };
  valuation.sourceToEur = source === "EUR" ? null : rates.get(source) ?? null;
  valuation.targetToEur = target === "EUR" ? null : rates.get(target) ?? null;
  valuation.missingCurrencies = [...new Set([source, target].filter((currency) => currency !== "EUR" && !rates.has(currency)))];
  valuation.stale = Boolean(valuation.sourceToEur?.stale || valuation.targetToEur?.stale);
  if (valuation.missingCurrencies.length) return { amount: null, valuation };
  return { amount: new ExactDecimal(amount).times(valuation.sourceToEur?.value ?? "1").div(valuation.targetToEur?.value ?? "1").toFixed(), valuation };
}

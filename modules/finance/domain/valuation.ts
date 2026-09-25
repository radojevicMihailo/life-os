import Decimal from "decimal.js";

const ExactDecimal = Decimal.clone({ precision: 80 });

export interface ValuationCandidate {
  value: string;
  source: string;
  effectiveAt: Date;
  retrievedAt?: Date;
}

export interface EffectiveValuation extends ValuationCandidate {
  ageMs: number;
  manual: boolean;
  stale: boolean;
}

export function selectEffectiveValue(input: {
  automatic?: ValuationCandidate;
  manual?: ValuationCandidate;
  now: Date;
  staleAfterMs: number;
}): EffectiveValuation | null {
  const selected = input.manual ?? input.automatic;
  if (!selected) return null;

  const manual = input.manual !== undefined;
  const ageMs = Math.max(0, input.now.getTime() - selected.effectiveAt.getTime());
  return {
    ...selected,
    source: manual ? "manual" : selected.source,
    ageMs,
    manual,
    stale: manual ? false : ageMs > input.staleAfterMs,
  };
}

export interface NetWorthAccountInput {
  accountId: string;
  classification: "asset" | "receivable" | "liability";
  currencyCode: string;
  nativeAmount: string;
}

function canonicalEurMoney(value: Decimal) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function calculateNetWorthEur(input: {
  accounts: NetWorthAccountInput[];
  investments: Array<{ instrumentId: string; eurAmount: string }>;
  ratesToEur: Map<string, ValuationCandidate>;
}) {
  const missing = new Set<string>();
  let total = new ExactDecimal(0);
  const accountValues = input.accounts.map((account) => {
    const native = new ExactDecimal(account.nativeAmount);
    const rate = account.currencyCode === "EUR"
      ? new ExactDecimal(1)
      : input.ratesToEur.has(account.currencyCode)
        ? new ExactDecimal(input.ratesToEur.get(account.currencyCode)!.value)
        : null;
    const eur = rate ? native.times(rate) : null;

    if (!eur && !native.isZero()) missing.add(account.currencyCode);
    if (eur) {
      total = account.classification === "liability" ? total.minus(eur) : total.plus(eur);
    }

    return {
      ...account,
      eurAmount: eur ? canonicalEurMoney(eur) : native.isZero() ? "0" : null,
    };
  });

  for (const investment of input.investments) {
    total = total.plus(investment.eurAmount);
  }

  return {
    accounts: accountValues,
    investments: input.investments,
    missingConversions: [...missing].sort(),
    totalEur: missing.size === 0 ? canonicalEurMoney(total) : null,
  };
}

import Decimal from "decimal.js";

const ExactDecimal = Decimal.clone({ precision: 80 });

/** A reservation is a plan, so spending may later leave that plan underfunded. */
export function calculateAccountPurposeBalance(balance: string, amounts: string[]) {
  const reserved = amounts.reduce((total, amount) => total.plus(amount), new ExactDecimal(0));
  const remainder = new ExactDecimal(balance).minus(reserved);
  return {
    reserved: reserved.toFixed(),
    free: ExactDecimal.max(remainder, 0).toFixed(),
    deficit: ExactDecimal.max(remainder.negated(), 0).toFixed(),
  };
}

export function reservationFits(balance: string, otherAmounts: string[], amount: string) {
  return new ExactDecimal(amount).lte(new ExactDecimal(balance).minus(
    otherAmounts.reduce((total, value) => total.plus(value), new ExactDecimal(0)),
  ));
}

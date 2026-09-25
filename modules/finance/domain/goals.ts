import Decimal from "decimal.js";

export function calculateGoalProgress(input: {
  balance: Decimal.Value;
  target: Decimal.Value;
}) {
  const target = new Decimal(input.target);

  if (target.lte(0)) {
    throw new Error("Goal target must be positive");
  }

  const balance = new Decimal(input.balance);

  return {
    balance: balance.toString(),
    percentage: balance.div(target).times(100).toString(),
  };
}

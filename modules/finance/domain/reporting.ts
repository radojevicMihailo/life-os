import Decimal from "decimal.js";
const D = Decimal.clone({ precision: 80 });
export function calculateSavingsRate(income: string | null, expense: string | null) {
    if (income === null || expense === null || new D(income).lte(0))
        return null;
    return new D(income).minus(expense).div(income).times(100).toFixed();
}

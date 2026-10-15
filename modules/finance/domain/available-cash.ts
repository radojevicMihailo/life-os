import Decimal from "decimal.js";
const D = Decimal.clone({ precision: 80 });
export interface CashAccountInput {
    id: string;
    balance: string;
    goalReserved: string;
    otherReserved: string;
    uncoveredPending: string;
    groups: {
        categoryId: string;
        month: string;
        reserved: string;
        pending: string;
    }[];
}
export function calculateAvailableCash(accounts: CashAccountInput[], days: number) {
    const total = accounts.reduce((sum, a) => sum.plus(a.balance).minus(a.goalReserved).minus(a.otherReserved).minus(a.uncoveredPending).minus(a.groups.reduce((r, g) => r.plus(D.max(g.reserved, g.pending)), new D(0))), new D(0));
    return { available: total.toFixed(), daily: D.max(total, 0).div(Math.max(1, days)).toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed(), deficit: D.max(total.negated(), 0).toFixed() };
}

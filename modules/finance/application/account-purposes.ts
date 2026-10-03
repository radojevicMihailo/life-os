import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
import { AccountsRepository } from "../db/repositories/accounts";
import { GoalsRepository } from "../db/repositories/goals";
import { LedgerRepository } from "../db/repositories/ledger";
import { accountPurposes, budgetLimits, categories } from "../db/schema";
import { reservationFits } from "../domain/account-purposes";
import { Money } from "../domain/money";
import { applicationError, type ApplicationDependencies } from "./ports";

export interface SetAccountPurposeInput {
  accountId: string;
  targetType: "goal" | "budget";
  targetId: string;
  amount: string;
}

export async function setAccountPurpose(deps: ApplicationDependencies, input: SetAccountPurposeInput) {
  return deps.unitOfWork.run(async (tx) => {
    // Goal editors lock the goal before its account; follow the same order.
    let targetCurrency: string;
    if (input.targetType === "goal") {
      const goal = await new GoalsRepository(tx).lockById(input.targetId);
      if (!goal.isActive) applicationError("goal_not_found");
      targetCurrency = goal.targetCurrencyCode;
    } else if (input.targetType === "budget") {
      const [budget] = await tx.select({ currencyCode: budgetLimits.currencyCode, isActive: categories.isActive })
        .from(budgetLimits).innerJoin(categories, eq(categories.id, budgetLimits.categoryId))
        .where(eq(budgetLimits.id, input.targetId)).for("update", { of: budgetLimits });
      if (!budget || !budget.isActive) applicationError("account_purpose_target_invalid");
      targetCurrency = budget.currencyCode;
    } else {
      applicationError("account_purpose_target_invalid");
    }
    // Ledger writers lock this same row. Balance check and write are atomic with
    // other reservations and new transactions; later spending can still create a deficit.
    const account = (await new AccountsRepository(tx).lockByIds([input.accountId]))[0];
    if (!account) applicationError("account_not_found");
    if (!account.isActive) applicationError("account_inactive");
    if (account.classification !== "asset" || account.isSystem) applicationError("goal_account_must_be_asset");
    if (input.targetType === "budget" && targetCurrency !== account.currencyCode) applicationError("account_purpose_currency_mismatch");
    const amount = Money.parse(input.amount, { code: account.currencyCode, minorUnit: account.minorUnit }).amount;
    const existing = await tx.select().from(accountPurposes).where(eq(accountPurposes.accountId, account.id));
    const same = existing.find((purpose) => input.targetType === "goal"
      ? purpose.goalId === input.targetId : purpose.budgetLimitId === input.targetId);
    const balance = (await new LedgerRepository(tx).getNativeBalances([account.id]))[0];
    if (!balance) applicationError("account_not_found");
    // Permit reducing an already underfunded reservation, so the user can repair a deficit.
    const reducing = same && new Decimal(amount).lte(same.amount);
    if (!reducing && !reservationFits(balance.displayBalance, existing.filter((p) => p.id !== same?.id).map((p) => p.amount), amount)) {
      applicationError("account_purpose_insufficient_balance");
    }
    if (same) {
      await tx.update(accountPurposes).set({ amount, updatedAt: deps.clock.now() }).where(eq(accountPurposes.id, same.id));
      return { id: same.id };
    }
    const id = deps.ids.nextId("accountPurpose");
    await tx.insert(accountPurposes).values({ id, accountId: account.id, currencyCode: account.currencyCode,
      goalId: input.targetType === "goal" ? input.targetId : null,
      budgetLimitId: input.targetType === "budget" ? input.targetId : null,
      amount, createdAt: deps.clock.now(), updatedAt: deps.clock.now() });
    return { id };
  });
}

export async function removeAccountPurpose(deps: ApplicationDependencies, input: { accountId: string; id: string }) {
  return deps.unitOfWork.run(async (tx) => {
    // Removal remains available for archived accounts and targets.
    const account = (await new AccountsRepository(tx).lockByIds([input.accountId]))[0];
    if (!account) applicationError("account_not_found");
    const [removed] = await tx.delete(accountPurposes).where(and(
      eq(accountPurposes.id, input.id), eq(accountPurposes.accountId, account.id),
    )).returning({ id: accountPurposes.id });
    if (!removed) applicationError("account_purpose_target_invalid");
    return removed;
  });
}

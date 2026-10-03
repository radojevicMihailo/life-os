import Decimal from "decimal.js";
import { eq } from "drizzle-orm";
import type { DbTx } from "../db/client";
import { accountPurposes, accounts, goals } from "../db/schema";
import { LedgerRepository } from "../db/repositories/ledger";
import { ValuationRepository } from "../db/repositories/valuation";
import { calculateAccountPurposeBalance } from "../domain/account-purposes";
import { convertGoalReservation, type GoalFxMetadata } from "../domain/goal-funds";
import { selectEffectiveValue, type EffectiveValuation } from "../domain/valuation";
import { env } from "../config/env";
const ExactDecimal = Decimal.clone({ precision: 80 });

export interface GoalValuationOptions { exchangeRateStaleAfterMs: number }
export interface GoalAllocation {
  id: string; accountId: string; accountName: string; currencyCode: string; amount: string;
  convertedAmount: string | null; valuation: GoalFxMetadata;
  accountActive: boolean; underfunded: boolean; accountDeficit: string;
}
export interface GoalFundReadModel {
  id: string; name: string; targetAmount: string; currencyCode: string; isActive: boolean;
  legacyAccountId: string | null; legacyAccountName: string | null;
  allocations: GoalAllocation[]; balance: string | null; percentage: string | null;
  complete: boolean; underfunded: boolean; stale: boolean;
}
export async function loadGoalFundsInTransaction(tx: DbTx, now: Date, options?: GoalValuationOptions): Promise<GoalFundReadModel[]> {
  const goalRows = await tx.select({ goal: goals, legacyAccountName: accounts.name }).from(goals)
    .leftJoin(accounts, eq(accounts.id, goals.accountId)).orderBy(goals.isActive, goals.name, goals.id);
  const purposes = await tx.select({ purpose: accountPurposes, account: accounts }).from(accountPurposes)
    .innerJoin(accounts, eq(accounts.id, accountPurposes.accountId)).orderBy(accounts.name, accountPurposes.id);
  const balances = await new LedgerRepository(tx).getNativeBalances([...new Set(purposes.map((p) => p.account.id))]);
  const funding = new Map(balances.map((balance) => [balance.accountId, calculateAccountPurposeBalance(balance.displayBalance,
    purposes.filter((p) => p.account.id === balance.accountId).map((p) => p.purpose.amount))]));
  const rateCurrencies = new Set<string>();
  for (const { goal } of goalRows) {
    for (const { purpose } of purposes.filter((p) => p.purpose.goalId === goal.id)) {
      if (purpose.currencyCode !== goal.targetCurrencyCode) {
        if (purpose.currencyCode !== "EUR") rateCurrencies.add(purpose.currencyCode);
        if (goal.targetCurrencyCode !== "EUR") rateCurrencies.add(goal.targetCurrencyCode);
      }
    }
  }
  const rates = new Map<string, EffectiveValuation>();
  const repository = new ValuationRepository(tx);
  for (const currency of rateCurrencies) {
    const { automatic, manual } = await repository.latestRate(currency);
    const rate = selectEffectiveValue({ now, staleAfterMs: options?.exchangeRateStaleAfterMs ?? env.EXCHANGE_RATE_STALE_AFTER_HOURS * 3600000,
      automatic: automatic ? { value: automatic.rate, source: automatic.provider, effectiveAt: automatic.providerTimestamp, retrievedAt: automatic.retrievedAt } : undefined,
      manual: manual ? { value: manual.value, source: "manual", effectiveAt: manual.effectiveAt, retrievedAt: manual.createdAt } : undefined });
    if (rate) rates.set(currency, rate);
  }
  return goalRows.map(({ goal, legacyAccountName }) => {
    const allocations: GoalAllocation[] = purposes.filter((p) => p.purpose.goalId === goal.id).map(({ purpose, account }) => {
      const conversion = convertGoalReservation(purpose.amount, purpose.currencyCode, goal.targetCurrencyCode, rates);
      const accountDeficit = funding.get(account.id)?.deficit ?? "0";
      return { id: purpose.id, accountId: account.id, accountName: account.name, currencyCode: purpose.currencyCode,
        amount: new ExactDecimal(purpose.amount).toFixed(), convertedAmount: conversion.amount, valuation: conversion.valuation,
        accountActive: account.isActive, underfunded: accountDeficit !== "0", accountDeficit };
    });
    const complete = allocations.every((a) => a.convertedAmount !== null);
    const balance = complete ? allocations.reduce((sum, a) => sum.plus(a.convertedAmount!), new ExactDecimal(0)).toFixed() : null;
    const percentage = balance === null ? null : new ExactDecimal(balance).div(goal.targetAmount).times(100).toFixed();
    return { id: goal.id, name: goal.name, targetAmount: new ExactDecimal(goal.targetAmount).toFixed(), currencyCode: goal.targetCurrencyCode,
      isActive: goal.isActive, legacyAccountId: goal.accountId, legacyAccountName, allocations, balance, percentage, complete,
      underfunded: allocations.some((a) => a.underfunded), stale: allocations.some((a) => a.valuation.stale) };
  });
}

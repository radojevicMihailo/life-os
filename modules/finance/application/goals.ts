import { AccountsRepository } from "../db/repositories/accounts";
import { GoalsRepository, type GoalRecord } from "../db/repositories/goals";
import { LedgerRepository } from "../db/repositories/ledger";
import { calculateGoalProgress } from "../domain/goals";
import { Money, defineCurrency } from "../domain/money";
import {
  applicationError,
  type ApplicationDependencies,
} from "./ports";

export interface CreateGoalInput {
  name: string;
  accountId: string;
  targetCurrencyCode: string;
  targetAmount: string;
}

export interface UpdateGoalInput extends CreateGoalInput {
  id: string;
}

export interface GoalProgress {
  goal: GoalRecord;
  balance: string;
  percentage: string;
}

function normalizeName(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    applicationError("goal_name_required");
  }
  return normalized;
}

async function validatedGoalValues(
  tx: Parameters<Parameters<ApplicationDependencies["unitOfWork"]["run"]>[0]>[0],
  input: CreateGoalInput,
) {
  const account = (await new AccountsRepository(tx).lockByIds([input.accountId]))[0];
  if (!account) applicationError("account_not_found");
  if (!account.isActive) applicationError("account_inactive");
  if (account.classification !== "asset") applicationError("goal_account_must_be_asset");
  if (input.targetCurrencyCode !== account.currencyCode) applicationError("goal_currency_mismatch");
  return {
    account,
    name: normalizeName(input.name),
    targetAmount: Money.parse(
      input.targetAmount,
      defineCurrency({ code: account.currencyCode, minorUnit: account.minorUnit }),
    ).amount,
  };
}

export async function createGoal(
  deps: ApplicationDependencies,
  input: CreateGoalInput,
): Promise<GoalRecord> {
  return deps.unitOfWork.run(async (tx) => {
    const { account, name, targetAmount } = await validatedGoalValues(tx, input);
    const now = deps.clock.now();

    return new GoalsRepository(tx).create({
      accountId: account.id,
      id: deps.ids.nextId("goal"),
      name,
      now,
      targetAmount,
      targetCurrencyCode: account.currencyCode,
    });
  });
}

export async function updateGoal(
  deps: ApplicationDependencies,
  input: UpdateGoalInput,
): Promise<GoalRecord> {
  return deps.unitOfWork.run(async (tx) => {
    const goals = new GoalsRepository(tx);
    const current = await goals.lockById(input.id);
    if (!current.isActive) applicationError("goal_not_found");
    const { account, name, targetAmount } = await validatedGoalValues(tx, input);
    return goals.update({
      id: input.id,
      accountId: account.id,
      name,
      targetAmount,
      targetCurrencyCode: account.currencyCode,
      now: deps.clock.now(),
    });
  });
}

export async function archiveGoal(
  deps: ApplicationDependencies,
  input: { id: string },
) {
  return deps.unitOfWork.run(async (tx) => {
    const goals = new GoalsRepository(tx);
    const current = await goals.lockById(input.id);
    if (!current.isActive) return current;
    return goals.archive(input.id, deps.clock.now());
  });
}

export async function getGoalProgress(
  deps: ApplicationDependencies,
  input: { id: string },
): Promise<GoalProgress> {
  return deps.unitOfWork.run(async (tx) => {
    const goal = await new GoalsRepository(tx).lockById(input.id);
    const balance = (await new LedgerRepository(tx).getNativeBalances([goal.accountId]))[0];

    if (!balance) {
      applicationError("account_not_found");
    }

    const progress = calculateGoalProgress({
      balance: balance.internalBalance,
      target: goal.targetAmount,
    });

    return { goal, ...progress };
  });
}

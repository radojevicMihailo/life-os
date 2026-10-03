import { AccountsRepository } from "../db/repositories/accounts";
import { GoalsRepository, type GoalRecord } from "../db/repositories/goals";
import { Money } from "../domain/money";
import { loadGoalFundsInTransaction, type GoalFundReadModel, type GoalValuationOptions } from "./goal-funds";
import { applicationError, type ApplicationDependencies } from "./ports";

export interface CreateGoalInput {
  name: string;
  targetCurrencyCode: string;
  targetAmount: string;
}
export interface UpdateGoalInput extends CreateGoalInput { id: string }
export type GoalProgress = GoalFundReadModel & { goal: GoalRecord };

async function validatedGoalValues(tx: Parameters<Parameters<ApplicationDependencies["unitOfWork"]["run"]>[0]>[0], input: CreateGoalInput, now: Date) {
  const name = input.name.trim();
  if (!name) applicationError("goal_name_required");
  const currency = await new AccountsRepository(tx).activateCurrency(input.targetCurrencyCode, now);
  return { name, targetCurrencyCode: currency.code,
    targetAmount: Money.parse(input.targetAmount, { code: currency.code, minorUnit: currency.minorUnit }).amount };
}
export async function createGoal(deps: ApplicationDependencies, input: CreateGoalInput): Promise<GoalRecord> {
  return deps.unitOfWork.run(async (tx) => new GoalsRepository(tx).create({
    ...await validatedGoalValues(tx, input, deps.clock.now()),
    accountId: null, id: deps.ids.nextId("goal"), now: deps.clock.now(),
  }));
}
export async function updateGoal(deps: ApplicationDependencies, input: UpdateGoalInput): Promise<GoalRecord> {
  return deps.unitOfWork.run(async (tx) => {
    const repository = new GoalsRepository(tx);
    const current = await repository.lockById(input.id);
    if (!current.isActive) applicationError("goal_not_found");
    return repository.update({ ...await validatedGoalValues(tx, input, deps.clock.now()), id: input.id, now: deps.clock.now() });
  });
}
export async function archiveGoal(deps: ApplicationDependencies, input: { id: string }) {
  return deps.unitOfWork.run(async (tx) => {
    const repository = new GoalsRepository(tx);
    const current = await repository.lockById(input.id);
    return current.isActive ? repository.archive(input.id, deps.clock.now()) : current;
  });
}
export async function getGoalProgress(deps: ApplicationDependencies, input: { id: string }, options?: GoalValuationOptions): Promise<GoalProgress> {
  return deps.unitOfWork.run(async (tx) => {
    const goal = await new GoalsRepository(tx).lockById(input.id);
    const fund = (await loadGoalFundsInTransaction(tx, deps.clock.now(), options)).find((item) => item.id === input.id);
    if (!fund) applicationError("goal_not_found");
    return { goal, ...fund };
  });
}

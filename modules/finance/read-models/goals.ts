import type { ApplicationDependencies } from "../application/ports";
import { loadGoalFundsInTransaction, type GoalValuationOptions } from "../application/goal-funds";
export type { GoalAllocation, GoalFundReadModel } from "../application/goal-funds";
export async function listGoals(dependencies: ApplicationDependencies, options?: GoalValuationOptions) {
  return dependencies.unitOfWork.run(async (tx) => ({ items: await loadGoalFundsInTransaction(tx, dependencies.clock.now(), options) }),
    { accessMode: "read only", isolationLevel: "repeatable read" });
}

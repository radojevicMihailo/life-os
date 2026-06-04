import { revalidatePath } from "next/cache";

export function revalidateGoalRoutes(opts?: { goalId?: string }) {
  revalidatePath("/goals");
  if (opts?.goalId) revalidatePath(`/goals/${opts.goalId}`);
}

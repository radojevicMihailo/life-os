"use server";

import { archiveGoal, createGoal, updateGoal } from "../../application/goals";
import type { ActionResult } from "../forms/action-result";
import { parseArchiveGoalForm, parseGoalForm } from "../forms/goal";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function saveGoalAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const parsed = parseGoalForm(formData);
    const result = parsed.id
      ? await updateGoal(mutationDependencies(), { ...parsed, id: parsed.id })
      : await createGoal(mutationDependencies(), parsed);
    return { id: result.id };
  }, { revalidate: ["/finance/goals", "/finance"] });
}

export async function archiveGoalAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await archiveGoal(mutationDependencies(), parseArchiveGoalForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/goals", "/finance"] });
}

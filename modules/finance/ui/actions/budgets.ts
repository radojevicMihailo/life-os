"use server";

import { setBudgetLimit } from "../../application/budgets";
import type { ActionResult } from "../forms/action-result";
import { parseBudgetForm } from "../forms/budget";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function setBudgetAction(_previous: ActionResult<{ updated: true }> | undefined, formData: FormData) {
  return executeAction(async () => {
    await setBudgetLimit(mutationDependencies(), parseBudgetForm(formData));
    return { updated: true as const };
  }, { financial: true, revalidate: ["/finance/budgets", "/finance"] });
}

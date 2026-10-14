"use server";

import { correctTransaction, deleteTransaction, recordTransaction } from "../../application/transactions";
import { identifier, parseField } from "../forms/common";
import type { ActionResult } from "../forms/action-result";
import { parseCorrectionForm, parseTransactionForm } from "../forms/transaction";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function createTransactionAction(
  _previous: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return executeAction(async () => {
    const result = await recordTransaction(mutationDependencies(), parseTransactionForm(formData));
    return { id: result.id };
  }, { financial: true, revalidate: ["/finance/transactions", "/finance", "/finance/accounts", "/finance/budgets", "/finance/goals"] });
}

export async function correctTransactionAction(
  _previous: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return executeAction(async () => {
    const result = await correctTransaction(mutationDependencies(), parseCorrectionForm(formData));
    return { id: result.replacement.id };
  }, { financial: true, revalidate: ["/finance/transactions", "/finance", "/finance/accounts", "/finance/budgets", "/finance/goals"] });
}

export async function deleteTransactionAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return executeAction(() => deleteTransaction(mutationDependencies(), { id: parseField("id", identifier, formData.get("id")) }), {
    financial: true, revalidate: ["/finance/transactions", "/finance", "/finance/accounts", "/finance/budgets", "/finance/goals"],
  });
}

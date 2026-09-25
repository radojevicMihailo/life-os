"use server";


import { clearManualOverride, setManualOverride } from "../../application/valuation";
import type { ActionResult } from "../forms/action-result";
import { parseClearOverrideForm, parseOverrideForm } from "../forms/override";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function setOverrideAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await setManualOverride(mutationDependencies(), parseOverrideForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/settings", "/finance", "/finance/accounts", "/finance/investments"] });
}
export async function clearOverrideAction(_previous: ActionResult<{ cleared: true }> | undefined, formData: FormData) {
  return executeAction(async () => {
    await clearManualOverride(mutationDependencies(), parseClearOverrideForm(formData));
    return { cleared: true as const };
  }, { revalidate: ["/finance/settings", "/finance", "/finance/accounts", "/finance/investments"] });
}

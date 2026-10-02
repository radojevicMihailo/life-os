"use server";
import { removeAccountPurpose, setAccountPurpose } from "../../application/account-purposes";
import { parseAccountPurposeForm, parseRemoveAccountPurposeForm } from "../forms/account-purpose";
import type { ActionResult } from "../forms/action-result";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function setAccountPurposeAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(() => setAccountPurpose(mutationDependencies(), parseAccountPurposeForm(formData)),
    { revalidate: ["/finance/accounts"] });
}
export async function removeAccountPurposeAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(() => removeAccountPurpose(mutationDependencies(), parseRemoveAccountPurposeForm(formData)),
    { revalidate: ["/finance/accounts"] });
}

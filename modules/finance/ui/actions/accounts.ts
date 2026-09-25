"use server";

import { activateCurrency, archiveAccount, createAccount } from "../../application/accounts";
import type { ActionResult } from "../forms/action-result";
import { parseAccountForm, parseActivateCurrencyForm, parseArchiveAccountForm } from "../forms/account";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function createAccountAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await createAccount(mutationDependencies(), parseAccountForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/accounts", "/finance/transactions", "/finance/goals", "/finance/investments", "/finance/settings"] });
}

export async function archiveAccountAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await archiveAccount(mutationDependencies(), parseArchiveAccountForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/accounts", "/finance/transactions", "/finance/goals", "/finance/investments", "/finance"] });
}

export async function activateCurrencyAction(_previous: ActionResult<{ currencyCode: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await activateCurrency(mutationDependencies(), parseActivateCurrencyForm(formData));
    return { currencyCode: result.code };
  }, { revalidate: ["/finance/settings", "/finance/accounts", "/finance/budgets", "/finance/investments"] });
}

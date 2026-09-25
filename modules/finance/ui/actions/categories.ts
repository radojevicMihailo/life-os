"use server";

import { archiveCategory, createCategory } from "../../application/categories";
import type { ActionResult } from "../forms/action-result";
import { parseArchiveCategoryForm, parseCategoryForm } from "../forms/category";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";

export async function createCategoryAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await createCategory(mutationDependencies(), parseCategoryForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/settings", "/finance/transactions", "/finance/budgets"] });
}

export async function archiveCategoryAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await archiveCategory(mutationDependencies(), parseArchiveCategoryForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/settings", "/finance/transactions", "/finance/budgets"] });
}

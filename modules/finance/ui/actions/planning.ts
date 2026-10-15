"use server";
import { savePlan, confirmOccurrence, linkOccurrence, skipOccurrence, archivePlan, setCashAccountPreferences } from "../../application/planning";
import { parsePlanForm, parseOccurrenceForm, parseConfirmationForm } from "../forms/planning";
import { identifier, parseField } from "../forms/common";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";
import type { ActionResult } from "../forms/action-result";
const options = { financial: true, revalidate: ["/finance", "/finance/planning", "/finance/transactions", "/finance/accounts", "/finance/budgets", "/finance/goals", "/finance/reports", "/finance/settings"] };
export async function savePlanAction(_: ActionResult<{
    id: string;
}> | undefined, data: FormData) { return executeAction(async () => ({ id: (await savePlan(mutationDependencies(), parsePlanForm(data))).id }), options); }
export async function confirmOccurrenceAction(_: ActionResult<{
    id: string;
}> | undefined, data: FormData) { return executeAction(() => confirmOccurrence(mutationDependencies(), parseConfirmationForm(data)), options); }
export async function linkOccurrenceAction(_: ActionResult<{
    id: string;
}> | undefined, data: FormData) { return executeAction(() => linkOccurrence(mutationDependencies(), { ...parseOccurrenceForm(data), transactionId: parseField("transactionId", identifier, data.get("transactionId")) }), options); }
export async function skipOccurrenceAction(_: ActionResult<{
    id: string;
}> | undefined, data: FormData) { return executeAction(async () => { const input = parseOccurrenceForm(data); await skipOccurrence(mutationDependencies(), input); return { id: input.ruleId }; }, options); }
export async function archivePlanAction(_: ActionResult<{
    id: string;
}> | undefined, data: FormData) { return executeAction(async () => { const id = parseField("id", identifier, data.get("id")); await archivePlan(mutationDependencies(), { id }); return { id }; }, options); }
export async function saveCashPreferencesAction(_: ActionResult<{
    id: string;
}> | undefined, data: FormData) {
    return executeAction(async () => {
        const ids = data.getAll("accountId").map(id => parseField("accountId", identifier, id));
        const included = new Set(data.getAll("included").map(String));
        await setCashAccountPreferences(mutationDependencies(), { accounts: ids.map(id => ({ id, included: included.has(id) })) });
        return { id: "preferences" };
    }, options);
}

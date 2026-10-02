import { asc, eq } from "drizzle-orm";
import type { ApplicationDependencies } from "../application/ports";
import { LedgerRepository } from "../db/repositories/ledger";
import { accountPurposes, accounts, budgetLimits, categories, goals } from "../db/schema";
import { calculateAccountPurposeBalance } from "../domain/account-purposes";

export interface AccountPurposeOption {
  id: string;
  type: "goal" | "budget";
  name: string;
  currencyCode: string;
}
export interface AccountPurposeItem {
  id: string;
  targetId: string;
  type: "goal" | "budget";
  name: string;
  amount: string;
  targetActive: boolean;
  budgetMonth?: string;
}
export interface AccountPurposeSummary {
  reserved: string;
  free: string;
  deficit: string;
  items: AccountPurposeItem[];
}

export async function getAccountPurposes(deps: ApplicationDependencies) {
  return deps.unitOfWork.run(async (tx) => {
    const assetAccounts = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.classification, "asset"));
    const balances = await new LedgerRepository(tx).getNativeBalances(assetAccounts.map((a) => a.id));
    const purposeRows = await tx.select().from(accountPurposes).orderBy(asc(accountPurposes.createdAt), asc(accountPurposes.id));
    const goalRows = await tx.select().from(goals).orderBy(asc(goals.name));
    const budgetRows = await tx.select({ id: budgetLimits.id, currencyCode: budgetLimits.currencyCode,
      month: budgetLimits.month, name: categories.name, isActive: categories.isActive })
      .from(budgetLimits).innerJoin(categories, eq(categories.id, budgetLimits.categoryId))
      .orderBy(asc(budgetLimits.month), asc(categories.name));
    const options: AccountPurposeOption[] = [
      ...goalRows.filter((g) => g.isActive).map((g) => ({ id: g.id, type: "goal" as const, name: `Cilj: ${g.name}`, currencyCode: g.targetCurrencyCode })),
      ...budgetRows.filter((b) => b.isActive).map((b) => ({ id: b.id, type: "budget" as const, name: `Budžet: ${b.name} · ${b.month.slice(0, 7)}`, currencyCode: b.currencyCode })),
    ];
    const summaries: Record<string, AccountPurposeSummary> = {};
    for (const balance of balances) {
      const items: AccountPurposeItem[] = purposeRows.filter((p) => p.accountId === balance.accountId).map((p) => {
        const goal = goalRows.find((g) => g.id === p.goalId);
        const budget = budgetRows.find((b) => b.id === p.budgetLimitId);
        return { id: p.id, targetId: p.goalId ?? p.budgetLimitId!, type: p.goalId ? "goal" : "budget",
          amount: p.amount, name: goal ? `Cilj: ${goal.name}` : budget ? `Budžet: ${budget.name} · ${budget.month.slice(0, 7)}` : "Nedostupna namena",
          targetActive: goal?.isActive ?? budget?.isActive ?? false,
          ...(budget ? { budgetMonth: budget.month.slice(0, 7) } : {}) };
      });
      summaries[balance.accountId] = { ...calculateAccountPurposeBalance(balance.displayBalance, items.map((p) => p.amount)), items };
    }
    return { summaries, options };
  }, { accessMode: "read only", isolationLevel: "repeatable read" });
}

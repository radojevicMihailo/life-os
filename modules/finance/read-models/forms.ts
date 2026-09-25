import { asc, eq, inArray } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import { accounts, categories, currencies, goals, instruments, investmentAccounts } from "../db/schema";

export async function getMutationOptions(dependencies: ApplicationDependencies) {
  return dependencies.unitOfWork.run(async (tx) => {
    const accountRows = await tx.select({ id: accounts.id, name: accounts.name, classification: accounts.classification, currencyCode: accounts.currencyCode, isActive: accounts.isActive })
      .from(accounts)
      .where(inArray(accounts.classification, ["asset", "liability", "receivable"]))
      .orderBy(asc(accounts.name));
    const categoryRows = await tx.select({ id: categories.id, name: categories.name, classification: categories.classification, isActive: categories.isActive })
      .from(categories).where(eq(categories.isSystem, false)).orderBy(asc(categories.name));
    const currencyRows = await tx.select({ code: currencies.code, name: currencies.name, minorUnit: currencies.minorUnit, isActive: currencies.isActive })
      .from(currencies).orderBy(asc(currencies.code));
    const goalRows = await tx.select({ id: goals.id, name: goals.name, accountId: goals.accountId, targetAmount: goals.targetAmount, targetCurrencyCode: goals.targetCurrencyCode, isActive: goals.isActive })
      .from(goals).orderBy(asc(goals.name));
    const instrumentRows = await tx.select({ id: instruments.id, symbol: instruments.symbol, name: instruments.name, class: instruments.class, quoteCurrencyCode: instruments.quoteCurrencyCode, providerId: instruments.providerId })
      .from(instruments).where(eq(instruments.isActive, true)).orderBy(asc(instruments.symbol));
    const investmentAccountRows = await tx.select({ id: investmentAccounts.id, name: investmentAccounts.name, cashAccountId: investmentAccounts.cashAccountId, cashCurrencyCode: accounts.currencyCode })
      .from(investmentAccounts).innerJoin(accounts, eq(accounts.id, investmentAccounts.cashAccountId))
      .where(eq(investmentAccounts.isActive, true)).orderBy(asc(investmentAccounts.name));
    return {
      accounts: accountRows,
      categories: categoryRows,
      currencies: currencyRows.filter((currency) => /^\d+$/.test(currency.minorUnit)),
      goals: goalRows,
      instruments: instrumentRows,
      investmentAccounts: investmentAccountRows,
    };
  }, { accessMode: "read only", isolationLevel: "repeatable read" });
}

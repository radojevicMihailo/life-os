import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { parseAccountForm } from "@/modules/finance/ui/forms/account";
import { parseBudgetForm } from "@/modules/finance/ui/forms/budget";
import { parseCategoryForm } from "@/modules/finance/ui/forms/category";
import { parseGoalForm } from "@/modules/finance/ui/forms/goal";
import { parseInstrumentResolutionForm, parseInvestmentAccountForm, parseInvestmentActivityForm, parseOpeningLotForm } from "@/modules/finance/ui/forms/investment";
import { parseTransactionForm } from "@/modules/finance/ui/forms/transaction";
import { parseOverrideForm } from "@/modules/finance/ui/forms/override";

function fieldErrors(work: () => unknown) {
  try {
    work();
    expect.unreachable("invalid form must fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ZodError);
    return (error as ZodError).flatten().fieldErrors;
  }
}

describe("form object schemas", () => {
  it.each([
    ["account", () => parseAccountForm({ name: "", classification: "asset", subtype: "", currencyCode: "" }), ["name", "subtype", "currencyCode"]],
    ["category", () => parseCategoryForm({ name: "", classification: "wrong" }), ["name", "classification"]],
    ["budget", () => parseBudgetForm({ categoryId: "", month: "2026-99", currencyCode: "", amount: "bad" }), ["categoryId", "month", "currencyCode", "amount"]],
    ["goal", () => parseGoalForm({ name: "", accountId: "", targetCurrencyCode: "", targetAmount: "bad" }), ["name", "accountId", "targetCurrencyCode", "targetAmount"]],
    ["instrument", () => parseInstrumentResolutionForm({ symbol: "", name: "", class: "bad", quoteCurrencyCode: "", provider: "bad" }), ["symbol", "name", "class", "quoteCurrencyCode", "provider"]],
    ["investment account", () => parseInvestmentAccountForm({ name: "", cashAccountId: "" }), ["name", "cashAccountId"]],
    ["opening lot date", () => parseOpeningLotForm({ investmentAccountId: "broker", instrumentId: "btc", quantity: "1", acquiredAt: "not-a-date", price: "1", currencyCode: "EUR", fees: "0", tradeFxRateToEur: "1" }), ["acquiredAt"]],
    ["investment activity metadata", () => parseInvestmentActivityForm({ operation: "buy", investmentAccountId: "broker", instrumentId: "btc", quantity: "1", amount: "1", fees: "0", tradeCurrencyCode: "wrong", tradeFxRateToEur: "1", occurredAt: "not-a-date" }), ["tradeCurrencyCode", "occurredAt"]],
    ["transaction date", () => parseTransactionForm({ operation: "income", accountId: "a", categoryId: "c", amount: "1", occurredAt: "not-a-date" }), ["occurredAt"]],
    ["override", () => parseOverrideForm({ kind: "market_quote", instrumentId: "", quoteCurrencyCode: "", value: "bad" }), ["instrumentId", "quoteCurrencyCode", "value"]],
  ])("paths %s errors to controls", (_case, work, expected) => {
    expect(Object.keys(fieldErrors(work))).toEqual(expect.arrayContaining(expected));
  });
});

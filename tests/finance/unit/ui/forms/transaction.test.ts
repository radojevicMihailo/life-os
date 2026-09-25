import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { parseCorrectionForm, parseTransactionForm } from "@/modules/finance/ui/forms/transaction";
import { parseShortcutRequest } from "@/modules/finance/application/shortcut";

describe("Serbian transaction form boundary", () => {
  it("normalizes decimal commas before handing an expense to the application", () => {
    expect(parseTransactionForm({
      operation: "expense",
      accountId: "account-1",
      categoryId: "category-1",
      amount: "1.234,56",
      occurredAt: "2026-08-31T12:30",
      description: "Ručak",
    })).toEqual({
      type: "expense",
      accountId: "account-1",
      categoryId: "category-1",
      amount: "1234.56",
      occurredAt: new Date("2026-08-31T10:30:00.000Z"),
      description: "Ručak",
      source: "web",
    });
  });

  it("requires the operation-specific category, destination amount/rate, and counterparty", () => {
    expect(() => parseTransactionForm({ operation: "income", accountId: "a", amount: "10" }))
      .toThrow();
    expect(() => parseTransactionForm({
      operation: "transfer",
      fromAccountId: "a",
      toAccountId: "b",
      fromAmount: "10",
    })).toThrow();
    expect(() => parseTransactionForm({
      operation: "receivable_out",
      fromAccountId: "a",
      receivableAccountId: "r",
      amount: "10",
    })).toThrow();
  });

  it.each([
    ["category", { operation: "expense", accountId: "a", amount: "10" }, { categoryId: expect.any(Array) }],
    ["foreign transfer amounts", { operation: "transfer", fromAccountId: "a", toAccountId: "b", fromAmount: "10" }, { toAmount: expect.any(Array) }],
    ["conflicting transfer inputs", { operation: "transfer", fromAccountId: "a", toAccountId: "b", amount: "10", fromAmount: "10", toAmount: "10" }, { amount: expect.any(Array), fromAmount: expect.any(Array) }],
    ["counterparty", { operation: "receivable_out", fromAccountId: "a", receivableAccountId: "r", amount: "10" }, { counterparty: expect.any(Array) }],
    ["decimal", { operation: "income", accountId: "a", categoryId: "c", amount: "not-money" }, { amount: expect.any(Array) }],
  ])("returns structured field errors for invalid %s", (_case, payload, expectedFields) => {
    try {
      parseTransactionForm(payload);
      expect.unreachable("invalid form must fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).flatten().fieldErrors).toMatchObject(expectedFields);
    }
  });

  it("maps credit-card purchase and repayment to shared ledger operations", () => {
    expect(parseTransactionForm({
      operation: "credit_card_purchase",
      accountId: "card",
      categoryId: "food",
      amount: "10,50",
    })).toMatchObject({ type: "expense", accountId: "card", amount: "10.5" });
    expect(parseTransactionForm({
      operation: "credit_card_repayment",
      fromAccountId: "bank",
      toAccountId: "card",
      amount: "100",
    })).toEqual({
      type: "transfer",
      fromAccountId: "bank",
      toAccountId: "card",
      amount: "100",
      source: "web",
    });
  });

  it("builds correction replacements for transfers and receivables while separating audit descriptions", () => {
    expect(parseCorrectionForm({
      originalId: "journal-1",
      operation: "transfer",
      fromAccountId: "eur",
      toAccountId: "usd",
      fromAmount: "100",
      toAmount: "110",
      replacementDescription: "Novi opis transakcije",
      correctionDescription: "Razlog storna",
    })).toEqual({
      originalId: "journal-1",
      replacement: {
        type: "transfer",
        fromAccountId: "eur",
        toAccountId: "usd",
        fromAmount: "100",
        toAmount: "110",
        description: "Novi opis transakcije",
        source: "web",
      },
      description: "Razlog storna",
      source: "web",
    });

    expect(parseCorrectionForm({
      originalId: "journal-2",
      operation: "receivable_repayment",
      receivableAccountId: "ana",
      toAccountId: "bank",
      amount: "50",
      counterparty: "Ana",
    })).toMatchObject({
      replacement: {
        type: "receivable_repayment",
        receivableAccountId: "ana",
        toAccountId: "bank",
        amount: "50",
        counterparty: "Ana",
      },
    });
  });

  it("keeps the Shortcut/API boundary canonical and rejects decimal commas", () => {
    expect(() => parseShortcutRequest({
      operation: "expense",
      accountId: "account-1",
      categoryId: "category-1",
      amount: "12,50",
    })).toThrow();
  });
});

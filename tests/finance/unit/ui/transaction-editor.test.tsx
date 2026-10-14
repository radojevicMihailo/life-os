import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/modules/finance/ui/actions/transactions", () => ({
  createTransactionAction: async () => ({ ok: true, value: { id: "unused" } }),
  correctTransactionAction: async () => ({ ok: true, value: { id: "unused" } }),
  deleteTransactionAction: async () => ({ ok: true, value: { id: "unused" } }),
}));
import { TransactionForm } from "@/app/finance/transactions/transaction-form";

it("opens an expense editor with editable account/category and the saved amount, description and local date", () => {
  const html = renderToStaticMarkup(createElement(TransactionForm, {
    accounts: [{ id: "bank", name: "Banka", classification: "asset", currencyCode: "EUR", isActive: true }],
    categories: [{ id: "food", name: "Hrana", classification: "expense", isActive: true }],
    transaction: { id: "tx-1", type: "expense", description: "Ručak", occurredAt: new Date("2026-10-13T22:30:00Z"), correctionDraft: { operation: "expense", accountId: "bank", categoryId: "food", amount: "25.5" } },
  }));
  expect(html).toMatch(/<select[^>]*name="accountId"/);
  expect(html).toMatch(/<select[^>]*name="categoryId"/);
  expect(html).toContain('value="bank" selected=""');
  expect(html).toContain('value="food" selected=""');
  expect(html).toContain('value="25,5"');
  expect(html).toContain('value="Ručak"');
  expect(html).toContain('value="2026-10-14"');
  expect(html).toContain('name="originalId"');
  expect(html).toContain("Sačuvaj izmene");
});

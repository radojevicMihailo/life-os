import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/finance/transactions" }));
vi.mock("@/modules/finance/ui/actions/transactions", () => ({
  createTransactionAction: async () => ({ ok: true, value: { id: "new" } }),
  correctTransactionAction: async () => ({ ok: true, value: { id: "corrected" } }),
  deleteTransactionAction: async () => ({ ok: true, value: { id: "deleted" } }),
}));
vi.mock("@/modules/finance/read-models/runtime", () => ({
  loadReadModelRuntime: async () => ({ dependencies: {} }),
}));
vi.mock("@/modules/finance/read-models/forms", () => ({
  getMutationOptions: async () => ({ accounts: [], categories: [] }),
}));
vi.mock("@/modules/finance/read-models/transactions", () => ({
  listTransactions: async () => ({ items: [{
    id: "tx", type: "expense", description: "Probni ručak",
    occurredAt: new Date("2026-10-16T12:00:00Z"),
    accountNames: ["Banka"], categoryNames: ["Hrana"],
    nativeAmounts: [{ accountName: "Banka", amount: "123.45", currencyCode: "EUR" }],
  }] }),
}));

import TransactionsPage from "@/app/finance/transactions/page";
import { TransactionForm } from "@/app/finance/transactions/transaction-form";
import { AppNav } from "@/modules/finance/ui/components/app-nav";
import { FinancePrivacy, FinancePrivacyProvider } from "@/modules/finance/ui/components/finance-privacy";

it("allows a blank new transaction in private mode without exempting prefilled editors", () => {
  const html = renderToStaticMarkup(<FinancePrivacyProvider><FinancePrivacy>
    <TransactionForm accounts={[]} categories={[]} />
    <TransactionForm accounts={[]} categories={[]} transaction={{
      id: "tx", type: "expense", description: "Sačuvano", occurredAt: new Date(),
      correctionDraft: { operation: "expense", accountId: "bank", categoryId: "food", amount: "123.45" },
    }} />
  </FinancePrivacy></FinancePrivacyProvider>);
  const forms = html.match(/<form\b[^>]*>/g)!;
  expect(forms[0]).toContain('data-finance-entry="true"');
  expect(forms[1]).not.toContain("data-finance-entry");
  expect(html).not.toContain("Unos, izmena i izvoz su skriveni");
});

it("uses the same full navigation labels and a direct transaction action at every width", () => {
  const html = renderToStaticMarkup(<AppNav />);
  for (const label of ["Transakcije", "Planiranje", "Investicije", "Podešavanja"])
    expect(html).toContain(`>${label}</`);
  expect(html).not.toContain(">Promet<");
  expect(html).not.toContain("md:hidden");
  expect(html).toContain('href="/finance/transactions#new-transaction"');
  expect(html).toContain("Nova transakcija");
});

it("renders one shared transaction table on mobile and desktop while masking saved amounts", async () => {
  const page = await TransactionsPage({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(<FinancePrivacyProvider><FinancePrivacy>{page}</FinancePrivacy></FinancePrivacyProvider>);
  expect(html.match(/Probni ručak/g)).toHaveLength(1);
  expect(html).not.toContain("md:hidden");
  expect(html).not.toContain("hidden overflow-x-auto md:block");
  expect(html).toContain('aria-label="Transakcije"');
  expect(html).not.toContain("123,45");
  expect(html).toContain("Finansijski podatak sakriven");
});

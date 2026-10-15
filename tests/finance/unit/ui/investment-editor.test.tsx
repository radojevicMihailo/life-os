import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/modules/finance/ui/actions/investments", () => ({ correctInvestmentTransactionAction: async () => ({ ok: true, value: { id: "unused" } }) }));
import { InvestmentCorrectionForm } from "@/app/finance/investments/investment-correction-form";

it("prefills opening totals, account, instrument, currency and local date without assuming a cash purchase", () => {
  const html = renderToStaticMarkup(createElement(InvestmentCorrectionForm, {
    activity: { id: "opening-1", investmentAccountId: "broker", instrumentId: "ibkr", journalTransactionId: null, type: "buy", symbol: "IBKR",
      occurredAt: new Date("2026-10-14T22:30:00Z"), quantity: "12", grossAmount: "1234.56", feeAmount: "0", tradeCurrencyCode: "USD", tradeFxRateToEur: "0.92" },
    accounts: [{ id: "broker", name: "IBKR USD", cashCurrencyCode: "USD" }],
    instruments: [{ id: "ibkr", symbol: "IBKR", name: "Interactive Brokers", quoteCurrencyCode: "USD" }],
    currencies: [{ code: "USD", isActive: true }],
  }));
  expect(html).toContain("Izmeni početni unos");
  expect(html).toContain("Ovaj unos ne menja gotovinu.");
  expect(html).toContain('name="originalId" value="opening-1"');
  expect(html).toContain('value="broker" selected=""');
  expect(html).toContain('value="ibkr" selected=""');
  expect(html).toContain('value="USD" selected=""');
  expect(html).toContain('value="1234,56"');
  expect(html).toContain('value="2026-10-15"');
});

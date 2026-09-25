import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Money } from "@/modules/finance/ui/components/money";
import { SourceBadge } from "@/modules/finance/ui/components/source-badge";
import { AppNav } from "@/modules/finance/ui/components/app-nav";
import { TransactionAmounts } from "@/modules/finance/ui/components/transaction-amounts";
import { ActionMessage } from "@/modules/finance/ui/components/action-message";

describe("financial display components", () => {
  it("renders structured field errors with stable control references", () => {
    const html = renderToStaticMarkup(<ActionMessage state={{
      ok: false,
      code: "validation_error",
      message: "Podaci nisu ispravni.",
      fields: { amount: "Unesite ispravan iznos.", categoryId: "Izaberite kategoriju." },
    }} />);

    expect(html).toContain('id="field-error-amount"');
    expect(html).toContain("Unesite ispravan iznos.");
    expect(html).toContain('id="field-error-categoryId"');
  });
  it("formats Serbian-Latin money while preserving the exact value for assistive technology", () => {
    const html = renderToStaticMarkup(
      <Money amount="-1234.5" currencyCode="EUR" label="Neto imovina" />,
    );

    expect(html).toContain("1.234,50");
    expect(html).toContain('aria-label="Neto imovina: -1234.5 EUR"');
  });

  it("does not lose precision while formatting amounts larger than Number can represent", () => {
    const html = renderToStaticMarkup(
      <Money amount="12345678901234567890.12" currencyCode="EUR" />,
    );

    expect(html).toContain("12.345.678.901.234.567.890,12");
  });

  it("uses the catalog minor unit for an activated currency", () => {
    const html = renderToStaticMarkup(
      <Money amount="1.234" currencyCode="BHD" minorUnit={3} />,
    );

    expect(html).toContain("1,234");
  });

  it.each([
    [{ manual: true, stale: false }, "Ručno"],
    [{ manual: false, stale: true }, "Zastarelo"],
    [{ manual: false, stale: false }, "Aktuelno"],
  ])("states source trust without relying on color", (state, label) => {
    const html = renderToStaticMarkup(
      <SourceBadge
        metadata={{
          ageMs: 60_000,
          effectiveAt: new Date("2026-08-30T10:00:00.000Z"),
          source: state.manual ? "manual" : "nbs",
          ...state,
        }}
      />,
    );

    expect(html).toContain(label);
    expect(html).toContain("nbs".replace("nbs", state.manual ? "manual" : "nbs"));
    expect(html).toContain('dateTime="2026-08-30T10:00:00.000Z"');
  });

  it("renders all seven finance destinations as accessible links", () => {
    const html = renderToStaticMarkup(<AppNav />);

    expect(html).toContain('aria-label="Finansije"');
    for (const href of [
      "/finance",
      "/finance/transactions",
      "/finance/accounts",
      "/finance/budgets",
      "/finance/goals",
      "/finance/investments",
      "/finance/settings",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("visibly associates each transfer leg with its account", () => {
    const html = renderToStaticMarkup(
      <TransactionAmounts
        amounts={[
          { accountName: "Zulu račun", amount: "-40", currencyCode: "EUR" },
          { accountName: "Alfa račun", amount: "40", currencyCode: "EUR" },
        ]}
      />,
    );

    expect(html).toContain("Zulu račun:");
    expect(html).toContain("Alfa račun:");
    expect(html.indexOf("Zulu račun:")).toBeLessThan(
      html.indexOf("Alfa račun:"),
    );
  });
});

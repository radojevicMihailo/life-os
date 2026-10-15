import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinancePrivacy, FinancialValue } from "@/modules/finance/ui/components/finance-privacy";
import { Money } from "@/modules/finance/ui/components/money";
import { GoalProgress } from "@/modules/finance/ui/components/goal-progress";

function display(hidden: boolean) {
  return renderToStaticMarkup(<FinancePrivacy initiallyHidden={hidden}>
    <Money amount="123456.78" currencyCode="EUR" label="Saldo" />
    <FinancialValue title="1.983 akcije" aria-label="Količina: 1.983">1.983</FinancialValue>
    <GoalProgress name="Štednja" balance="2345" targetAmount="54321" percentage="4.317" currencyCode="EUR" />
  </FinancePrivacy>);
}

describe("finance privacy", () => {
  it("masks money, quantities, percentages, titles and accessible labels on the first render", () => {
    const html = display(true);
    for (const secret of ["123456", "123.456", "1.983", "2345", "2.345", "54321", "54.321", "4.317", "4,3"])
      expect(html).not.toContain(secret);
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("aria-valuenow");
    expect(html).toContain("Finansijski podatak sakriven");
    expect(html).toContain("Prikaži iznose");
    expect(html).toContain('data-finance-private="true"');
  });

  it("keeps original precision and accessibility when amounts are visible", () => {
    const html = display(false);
    expect(html).toContain('aria-label="Saldo: 123456.78 EUR"');
    expect(html).toContain('title="1.983 akcije"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("Sakrij iznose");
  });
});

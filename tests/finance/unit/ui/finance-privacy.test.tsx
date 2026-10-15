import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinancePrivacy, FinancePrivacyProvider, FinancePrivacyToggle, FinancialValue } from "@/modules/finance/ui/components/finance-privacy";
import { Money } from "@/modules/finance/ui/components/money";
import { GoalProgress } from "@/modules/finance/ui/components/goal-progress";

function display(hidden: boolean) {
  return renderToStaticMarkup(<FinancePrivacyProvider initiallyHidden={hidden}><FinancePrivacy>
    <Money amount="123456.78" currencyCode="EUR" label="Saldo" />
    <FinancialValue title="1.983 akcije" aria-label="Količina: 1.983">1.983</FinancialValue>
    <GoalProgress name="Štednja" balance="2345" targetAmount="54321" percentage="4.317" currencyCode="EUR" />
  </FinancePrivacy></FinancePrivacyProvider>);
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


it("hides finance and Today goal values by default using one shared provider", () => {
  const html = renderToStaticMarkup(<FinancePrivacyProvider>
    <section aria-label="Finansijski ciljevi">
      <FinancePrivacyToggle />
      <GoalProgress name="Putovanje" balance="3210" targetAmount="9876" percentage="32.5" currencyCode="EUR" />
    </section>
    <FinancePrivacy><Money amount="123456.78" currencyCode="EUR" /></FinancePrivacy>
  </FinancePrivacyProvider>);
  const content = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
  for (const secret of ["3.210", "9.876", "32,5", "123.456", "aria-valuenow", "Iznos:"])
    expect(content).not.toContain(secret);
  expect(html.match(/Prikaži iznose/g)).toHaveLength(2);
});

it("shows Today goal values and finance amounts together when visibility is enabled", () => {
  const html = renderToStaticMarkup(<FinancePrivacyProvider initiallyHidden={false}>
    <FinancePrivacyToggle />
    <GoalProgress name="Putovanje" balance="3210" targetAmount="9876" percentage="32.5" currencyCode="EUR" />
    <FinancePrivacy><Money amount="123456.78" currencyCode="EUR" /></FinancePrivacy>
  </FinancePrivacyProvider>);
  expect(html).toContain("3.210");
  expect(html).toContain("123.456");
  expect(html.match(/Sakrij iznose/g)).toHaveLength(2);
});

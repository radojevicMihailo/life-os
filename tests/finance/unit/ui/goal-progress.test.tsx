import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GoalProgress } from "@/modules/finance/ui/components/goal-progress";

it("does not turn missing exchange rates into zero or complete progress", () => {
  const html = renderToStaticMarkup(createElement(GoalProgress, { name: "Emergency", balance: null, percentage: null, targetAmount: "1000", currencyCode: "EUR" }));
  expect(html).toContain("Nedostaje kurs");
  expect(html).not.toContain('role="progressbar"');
  expect(html).not.toContain("0%");
  expect(html).not.toContain("NaN");
});
it("shows allocation progress but identifies underfunding instead of presenting success", () => {
  const html = renderToStaticMarkup(createElement(GoalProgress, { name: "Emergency", balance: "1000", percentage: "100", targetAmount: "1000", currencyCode: "EUR", underfunded: true }));
  expect(html).toContain('aria-valuenow="100"');
  expect(html).toContain("Nedostaje novac na računu");
  expect(html).not.toContain("Cilj ispunjen");
});
it("caps the visual bar while retaining the real above-target balance", () => {
  const html = renderToStaticMarkup(createElement(GoalProgress, { name: "Emergency", balance: "1200", percentage: "120", targetAmount: "1000", currencyCode: "EUR" }));
  expect(html).toContain('aria-valuenow="100"');
  expect(html).toContain("120%");
  expect(html).toContain('width:100%');
});
it("marks aggregate goal progress as estimated when an allocation uses a stale rate", () => {
  const html = renderToStaticMarkup(createElement(GoalProgress, { name: "Emergency", balance: "1000", percentage: "100", targetAmount: "1000", currencyCode: "EUR", stale: true }));
  expect(html).toContain("Procena koristi zastareo kurs");
});

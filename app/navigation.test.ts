import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import Home from "./page";
import { NavTree } from "@/components/nav-tree";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
let dashboardState = {
  date: "2026-09-26T12:00:00.000Z",
  habits: [{ id: "habit-1", title: "Čitanje", completed: true }],
  goals: [{ id: "goal-1", name: "Putovanje", balance: "500", targetAmount: "1000", currencyCode: "EUR", percentage: "50" }],
  plan: [{ id: "task:1", title: "Rad na projektu", startsAt: "2026-09-26T08:00:00.000Z", href: "/tasks/1", source: "task", allDay: false }],
  calendarError: null as string | null,
};
vi.mock("./_lib/dashboard", () => ({
  loadHomeDashboard: async () => dashboardState,
}));

it("shows only main sections in the sidebar", () => {
  const html = renderToStaticMarkup(createElement(NavTree));

  for (const href of ["/task-manager", "/finance", "/physical", "/habits", "/goals", "/notes", "/meals", "/travels"]) {
    expect(html).toContain(`href="${href}"`);
  }
  expect(html).not.toContain("aria-expanded=");
});

it("shows the daily cockpit with real dashboard regions", async () => {
  const html = renderToStaticMarkup(await Home());

  expect(html).toContain("Danas biram");
  expect(html).toContain("Čitanje");
  expect(html).toContain("Putovanje");
  expect(html).toContain("Rad na projektu");
  expect(html).toContain('href="/finance/goals"');
  expect(html).not.toContain("Fokus tajmer");
  expect(html).not.toContain("Top 3 zadatka");
});

it("shows useful empty states without invented values", async () => {
  dashboardState = { ...dashboardState, habits: [], goals: [], plan: [] };
  const html = renderToStaticMarkup(await Home());
  expect(html).toContain("Još nema navika za danas");
  expect(html).toContain("Još nema aktivnih finansijskih ciljeva");
  expect(html).toContain("Danas nema zakazanih aktivnosti");
  expect(html).not.toContain("Čitanje");
  expect(html).not.toContain("Putovanje");
});

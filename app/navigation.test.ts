import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import Home from "./page";
import { NavTree } from "@/components/nav-tree";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

it("shows only main sections in the sidebar", () => {
  const html = renderToStaticMarkup(createElement(NavTree));

  for (const href of ["/task-manager", "/finance", "/physical", "/habits", "/goals", "/notes", "/meals", "/travels"]) {
    expect(html).toContain(`href="${href}"`);
  }
  expect(html).not.toContain("aria-expanded=");
});

it("shows every main section on the home page without onboarding instructions", () => {
  const html = renderToStaticMarkup(createElement(Home));

  for (const href of ["/task-manager", "/finance", "/physical", "/habits", "/goals", "/notes", "/meals", "/travels"]) {
    expect(html).toContain(`href="${href}"`);
  }
  expect(html).not.toContain("How it works");
});

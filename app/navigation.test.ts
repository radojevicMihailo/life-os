import { createElement, type ReactNode } from "react";
import { PassThrough } from "node:stream";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import Home from "./page";
import { NavTree } from "@/components/nav-tree";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/app/habits/_actions/logs", () => ({ upsertLog: vi.fn() }));
vi.mock("@/app/(tasks)/_actions/tasks", () => ({ setTaskStatus: vi.fn(), updateTask: vi.fn() }));
const loaders = vi.hoisted(() => ({ habits: vi.fn(), goals: vi.fn(), tasks: vi.fn(), calendar: vi.fn() }));
vi.mock("./_lib/dashboard", () => ({ loadDashboardHabits: loaders.habits, loadDashboardGoals: loaders.goals, loadDashboardTasks: loaders.tasks, loadDashboardCalendar: loaders.calendar }));
beforeEach(() => {
  loaders.habits.mockResolvedValue([{ habit: { id: "habit-1", title: "Čitanje", kind: "binary" }, count: 1 }]);
  loaders.goals.mockResolvedValue([{ id: "goal-1", name: "Putovanje", balance: "500", targetAmount: "1000", currencyCode: "EUR", percentage: "50" }]);
  loaders.tasks.mockResolvedValue([{ id: "task-1", title: "Važan zadatak", actionAt: null, actionEndAt: null, dueAt: null, priority: "Q1 - hitno i bitno" }]);
  loaders.calendar.mockResolvedValue({ plan: [{ id: "task:1", title: "Rad na projektu", startsAt: "2026-09-26T08:00:00Z", href: "/tasks/1", source: "task", allDay: false }], calendarError: null });
});
function renderStream(node: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    let html = "";
    output.on("data", (chunk) => { html += String(chunk); });
    output.on("end", () => resolve(html));
    const stream = renderToPipeableStream(node, { onAllReady() { stream.pipe(output); }, onError: reject });
  });
}
it("shows only main sections in the sidebar", () => {
  const html = renderToStaticMarkup(createElement(NavTree));
  for (const href of ["/task-manager", "/finance", "/physical", "/habits", "/goals", "/notes", "/meals", "/travels"]) expect(html).toContain(`href="${href}"`);
  expect(html).not.toContain("aria-expanded=");
});
it("streams the cockpit with editable habits, priority task actions and quick destinations", async () => {
  const html = await renderStream(createElement(Home));
  for (const copy of ["Danas biram", "Čitanje", "Putovanje", "Rad na projektu", "Tri najvažnija zadatka", "Pomeri termin", "Završi", "Brzi unos"]) expect(html).toContain(copy);
  expect(html).toContain('href="/finance/transactions#new-transaction"');
  expect(html).toContain('href="/finance/goals"');
  expect(html).toContain('aria-label="Označi naviku: Čitanje"');
});
it("streams usable task, habit and goal content before the calendar resolves", async () => {
  let release!: (value: { plan: []; calendarError: null }) => void;
  loaders.calendar.mockReturnValue(new Promise((resolve) => { release = resolve; }));
  const output = new PassThrough();
  let html = "";
  let stream: ReturnType<typeof renderToPipeableStream>;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { stream.abort(); reject(new Error("Other panels waited for calendar")); }, 1000);
    output.on("data", (chunk) => {
      html += String(chunk);
      if (["Važan zadatak", "Čitanje", "Putovanje"].every((text) => html.includes(text))) {
        clearTimeout(timeout);
        resolve();
      }
    });
    stream = renderToPipeableStream(createElement(Home), { onShellReady() { stream.pipe(output); }, onError: reject });
  });
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("Danas biram");
  const completed = new Promise<void>((resolve) => output.on("end", resolve));
  release({ plan: [], calendarError: null });
  await completed;
});
it("shows useful empty states without invented values", async () => {
  loaders.habits.mockResolvedValue([]); loaders.goals.mockResolvedValue([]); loaders.tasks.mockResolvedValue([]); loaders.calendar.mockResolvedValue({ plan: [], calendarError: null });
  const html = await renderStream(createElement(Home));
  expect(html).toContain("Još nema navika za danas");
  expect(html).toContain("Još nema aktivnih finansijskih ciljeva");
  expect(html).toContain("Danas nema zakazanih aktivnosti");
  expect(html).not.toContain("Čitanje");
});
it("contains panel failures and keeps the remaining sections usable", async () => {
  loaders.habits.mockRejectedValue(new Error("database unavailable"));
  loaders.calendar.mockResolvedValue({ plan: [], calendarError: "offline" });
  const html = await renderStream(createElement(Home));
  expect(html).toContain("Podaci trenutno nisu dostupni");
  expect(html).toContain("Google kalendar trenutno nije dostupan");
  expect(html).toContain("Važan zadatak");
  expect(html).toContain("Putovanje");
});

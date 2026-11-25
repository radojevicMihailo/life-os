import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { startOfWeek } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { CalendarView, type CalendarItem } from "./CalendarView";

vi.mock("./CreateTaskDialog", () => ({ CreateTaskDialog: () => null }));

function googleItem(meetUrl?: string): CalendarItem {
  const date = startOfWeek(new Date(), { weekStartsOn: 1 });
  date.setHours(12, 0, 0, 0);
  return {
    id: "google-event",
    taskId: null,
    title: "Team meeting",
    status: null,
    kind: "gcal",
    source: "google",
    dateISO: date.toISOString(),
    hasTime: true,
    meetUrl,
  };
}

describe("CalendarView Google events", () => {
  it("links an event with a Meet URL to the meeting in a new tab", () => {
    const html = renderToStaticMarkup(createElement(CalendarView, {
      items: [googleItem("https://meet.google.com/abc-defg-hij")],
      contexts: [],
    }));
    expect(html).toContain('href="https://meet.google.com/abc-defg-hij"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("opens Meet with the account that received the event", () => {
    const html = renderToStaticMarkup(createElement(CalendarView, {
      items: [{ ...googleItem("https://meet.google.com/abc-defg-hij?foo=bar"), accountEmail: "work@example.com" }],
      contexts: [],
    }));
    expect(html).toContain('href="https://meet.google.com/abc-defg-hij?foo=bar&amp;authuser=work%40example.com"');
  });

  it("leaves events without a Meet URL unlinked", () => {
    const html = renderToStaticMarkup(createElement(CalendarView, {
      items: [googleItem()],
      contexts: [],
    }));
    expect(html).toContain("Team meeting");
    expect(html).not.toContain("meet.google.com");
  });

  it("tints event backgrounds from the active theme and preserves event accents", () => {
    const event = googleItem();
    const task: CalendarItem = {
      ...event,
      id: "task",
      taskId: "task",
      kind: "action",
      source: "task",
      status: "in_progress",
    };
    const html = renderToStaticMarkup(createElement(CalendarView, {
      items: [
        event,
        { ...event, id: "second-account", accountIdx: 1 },
        task,
        { ...task, id: "custom-context", contextColor: "#795a3a" },
        { ...task, id: "invalid-context", contextColor: "red" },
      ],
      contexts: [],
    }));
    for (const accent of ["var(--chart-2)", "var(--chart-3)", "#795a3a"]) {
      expect(html).toContain(`background-color:color-mix(in srgb, ${accent} 14%, var(--card))`);
    }
    expect(html.match(/border-inline-start-color:var\(--action\)/g)).toHaveLength(2);
  });
});

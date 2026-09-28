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

  it("leaves events without a Meet URL unlinked", () => {
    const html = renderToStaticMarkup(createElement(CalendarView, {
      items: [googleItem()],
      contexts: [],
    }));
    expect(html).toContain("Team meeting");
    expect(html).not.toContain("meet.google.com");
  });
});

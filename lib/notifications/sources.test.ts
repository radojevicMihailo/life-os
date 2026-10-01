import { afterEach, expect, it, vi } from "vitest";
import { collectReminders } from "./sources";
import { listEvents } from "@/lib/google/calendar";
vi.mock("@/lib/google/calendar", () => ({ isConfigured: () => true, listEvents: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
it("uses timed action/due dates and selected timed Google events without duplicate task times", async () => {
  const pool = { query: vi.fn(async (sql: string) => ({ rows: sql.includes("FROM tasks") ? [
    { id: "a", title: "Call", action_at: "2026-10-01T10:30:00Z", due_at: "2026-10-01T10:30:00Z" },
    { id: "b", title: "Deadline", action_at: null, due_at: "2026-10-01T10:15:00Z" },
    { id: "c", title: "Date only", action_at: "2026-09-30T22:00:00Z", due_at: null },
  ] : [{ google_calendar_ids: ["1:work@example.com", "1:work@example.com"] }] })) };
  vi.mocked(listEvents).mockResolvedValue([
    { id: "1:work:call", calendarId: "work@example.com", summary: "Google call", startISO: "2026-10-01T10:20:00Z", hasTime: true },
    { id: "1:work:day", calendarId: "work@example.com", summary: "All day", startISO: "2026-10-01T00:00:00Z", hasTime: false },
  ]);
  const result = await collectReminders(pool, new Date("2026-10-01T10:00:00Z"));
  expect(result.map((r) => [r.key, r.url])).toEqual([["task:a", "/tasks/a"], ["due:b", "/tasks/b"], ["google:1:work:call", "/calendar"]]);
});
it("keeps task reminders when Google fails", async () => {
  const pool = { query: vi.fn(async (sql: string) => ({ rows: sql.includes("FROM tasks") ? [{ id: "a", title: "Call", action_at: "2026-10-01T10:30:00Z", due_at: null }] : [{ google_calendar_ids: ["work"] }] })) };
  vi.mocked(listEvents).mockRejectedValue(new Error("Google unavailable"));
  expect((await collectReminders(pool, new Date("2026-10-01T10:00:00Z"))).map((r) => r.key)).toEqual(["task:a"]);
});

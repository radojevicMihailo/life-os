import { afterEach, describe, expect, it, vi } from "vitest";
import { taskCandidates, googleCandidates } from "../scripts/notify-upcoming.mjs";

const originalEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  GOOGLE_REFRESH_TOKENS: process.env.GOOGLE_REFRESH_TOKENS,
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("upcoming notification sources", () => {
  it("includes timed action and due entries, but skips date-only and duplicate times", async () => {
    const now = new Date("2026-09-29T09:00:00Z");
    const pool = { query: vi.fn().mockResolvedValue({ rows: [
      { id: "a", title: "Meeting", action_at: "2026-09-29T09:30:00Z", due_at: "2026-09-29T09:30:00Z" },
      { id: "b", title: "Deadline", action_at: null, due_at: "2026-09-29T09:20:00Z" },
    ] }) };
    const items = await taskCandidates(pool, now, new Date("2026-09-29T09:40:00Z"));
    expect(items.map((item) => item.key)).toEqual(["a", "due:b"]);

    pool.query.mockResolvedValueOnce({ rows: [
      { id: "c", title: "Date only", action_at: null, due_at: "2026-09-28T22:00:00Z" },
    ] });
    const dateOnly = await taskCandidates(
      pool,
      new Date("2026-09-28T21:45:00Z"),
      new Date("2026-09-28T22:40:00Z"),
    );
    expect(dateOnly).toEqual([]);
  });

  it("reads timed events from selected Google calendars and skips all-day events", async () => {
    process.env.GOOGLE_CLIENT_ID = "client";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.GOOGLE_REFRESH_TOKEN = "refresh";
    delete process.env.GOOGLE_REFRESH_TOKENS;
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ google_calendar_ids: ["work@example.com"] }] }) };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [
        { id: "timed", summary: "Call", start: { dateTime: "2026-09-29T09:30:00Z" } },
        { id: "all-day", summary: "Holiday", start: { date: "2026-09-29" } },
        { id: "cancelled", status: "cancelled", start: { dateTime: "2026-09-29T09:25:00Z" } },
      ] }), { status: 200 }));
    const items = await googleCandidates(pool, new Date("2026-09-29T09:00:00Z"), new Date("2026-09-29T09:40:00Z"));
    expect(items.map((item) => item.key)).toEqual(["google:0:work@example.com:timed"]);
    expect(fetchMock.mock.calls[1][0]).toContain("/calendars/work%40example.com/events?");
  });
});

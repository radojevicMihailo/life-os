import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/queries/settings", () => ({
  getSelectedGoogleCalendars: vi.fn(),
  setSelectedGoogleCalendars: vi.fn(),
}));
vi.mock("@/lib/google/calendar", () => ({
  isConfigured: vi.fn(),
  listCalendars: vi.fn(),
  listEvents: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import * as settings from "@/lib/queries/settings";
import * as gcal from "@/lib/google/calendar";

describe("google server actions", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("listGoogleCalendarsAction returns connected:false when not configured", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const mod = await import("./google");
    const res = await mod.listGoogleCalendarsAction();
    expect(res).toEqual({ connected: false, calendars: [], selected: [] });
  });

  it("listGoogleCalendarsAction merges calendars + selection when connected", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (gcal.listCalendars as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "a", summary: "A", primary: true },
    ]);
    (settings.getSelectedGoogleCalendars as ReturnType<typeof vi.fn>).mockResolvedValue(["a"]);
    const mod = await import("./google");
    const res = await mod.listGoogleCalendarsAction();
    expect(res).toEqual({
      connected: true,
      calendars: [{ id: "a", summary: "A", primary: true }],
      selected: ["a"],
    });
  });

  it("saveSelectedGoogleCalendarsAction validates and persists", async () => {
    const mod = await import("./google");
    await mod.saveSelectedGoogleCalendarsAction(["a", "b"]);
    expect(settings.setSelectedGoogleCalendars).toHaveBeenCalledWith(["a", "b"]);
  });

  it("saveSelectedGoogleCalendarsAction rejects non-string array", async () => {
    const mod = await import("./google");
    await expect(
      // @ts-expect-error invalid input
      mod.saveSelectedGoogleCalendarsAction([1, 2]),
    ).rejects.toThrow();
  });

  it("fetchGoogleEventsAction returns empty when not configured", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const mod = await import("./google");
    const res = await mod.fetchGoogleEventsAction("2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z");
    expect(res).toEqual({ items: [], error: null });
  });

  it("fetchGoogleEventsAction fans out across selected calendars", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (settings.getSelectedGoogleCalendars as ReturnType<typeof vi.fn>).mockResolvedValue(["a", "b"]);
    (gcal.listEvents as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => [
      {
        id: `${id}:e1`,
        calendarId: id,
        summary: `evt-${id}`,
        startISO: "2026-06-02T10:00:00.000Z",
        endISO: "2026-06-02T11:00:00.000Z",
        hasTime: true,
      },
    ]);
    const mod = await import("./google");
    const res = await mod.fetchGoogleEventsAction(
      "2026-06-01T00:00:00.000Z",
      "2026-06-08T00:00:00.000Z",
    );
    expect(res.error).toBeNull();
    expect(res.items).toHaveLength(2);
    expect(res.items[0].source).toBe("google");
    expect(res.items[0].kind).toBe("gcal");
  });

  it("fetchGoogleEventsAction tolerates partial calendar failure", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (settings.getSelectedGoogleCalendars as ReturnType<typeof vi.fn>).mockResolvedValue(["ok", "bad"]);
    (gcal.listEvents as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => {
      if (id === "bad") throw new Error("boom");
      return [
        {
          id: `${id}:e1`,
          calendarId: id,
          summary: "ok",
          startISO: "2026-06-02T10:00:00.000Z",
          hasTime: true,
        },
      ];
    });
    const mod = await import("./google");
    const res = await mod.fetchGoogleEventsAction(
      "2026-06-01T00:00:00.000Z",
      "2026-06-08T00:00:00.000Z",
    );
    expect(res.items).toHaveLength(1);
    expect(res.error).toBe("partial");
  });
});

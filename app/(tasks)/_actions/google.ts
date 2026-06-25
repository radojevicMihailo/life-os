"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isConfigured,
  listAllCalendars,
  listEvents,
  type GoogleCalendarInfoWithAccount,
} from "@/lib/google/calendar";
import { GoogleAuthError } from "@/lib/google/errors";
import {
  getSelectedGoogleCalendars,
  setSelectedGoogleCalendars,
} from "@/lib/queries/settings";

export type GoogleCalendarItem = {
  id: string;
  taskId: null;
  title: string;
  status: null;
  kind: "gcal";
  source: "google";
  dateISO: string;
  endISO?: string;
  hasTime: boolean;
};

export type ListCalendarsResult = {
  connected: boolean;
  calendars: GoogleCalendarInfoWithAccount[];
  selected: string[];
};

function toCompositeId(accountIdx: number, calendarId: string) {
  return `${accountIdx}:${calendarId}`;
}

function parseCompositeId(raw: string): { accountIdx: number; calendarId: string } {
  const m = /^(\d+):(.+)$/.exec(raw);
  if (m) return { accountIdx: Number(m[1]), calendarId: m[2] };
  return { accountIdx: 0, calendarId: raw };
}

export async function listGoogleCalendarsAction(): Promise<ListCalendarsResult> {
  if (!isConfigured()) return { connected: false, calendars: [], selected: [] };
  try {
    const [calendars, selectedRaw] = await Promise.all([
      listAllCalendars(),
      getSelectedGoogleCalendars(),
    ]);
    const selected = selectedRaw.map((s) => {
      const { accountIdx, calendarId } = parseCompositeId(s);
      return toCompositeId(accountIdx, calendarId);
    });
    return { connected: true, calendars, selected };
  } catch (err) {
    console.error("[google] listGoogleCalendarsAction failed", err);
    return { connected: true, calendars: [], selected: [] };
  }
}

const idsSchema = z.array(z.string().min(1)).max(100);

export async function saveSelectedGoogleCalendarsAction(ids: string[]): Promise<void> {
  const parsed = idsSchema.parse(ids);
  await setSelectedGoogleCalendars([...new Set(parsed)]);
  revalidatePath("/calendar");
}

export type FetchEventsResult = {
  items: GoogleCalendarItem[];
  error: null | "auth" | "fetch" | "partial";
};

export async function fetchGoogleEventsAction(
  startISO: string,
  endISO: string,
): Promise<FetchEventsResult> {
  if (!isConfigured()) return { items: [], error: null };
  let selected: string[];
  try {
    selected = await getSelectedGoogleCalendars();
  } catch {
    return { items: [], error: "fetch" };
  }
  if (selected.length === 0) return { items: [], error: null };

  const targets = [...new Set(selected)].map(parseCompositeId);
  const results = await Promise.allSettled(
    targets.map((t) => listEvents(t.calendarId, startISO, endISO, t.accountIdx)),
  );

  let anyAuth = false;
  let anyFail = false;
  const items: GoogleCalendarItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const e of r.value) {
        items.push({
          id: e.id,
          taskId: null,
          title: e.summary,
          status: null,
          kind: "gcal",
          source: "google",
          dateISO: e.startISO,
          endISO: e.endISO,
          hasTime: e.hasTime,
        });
      }
    } else {
      anyFail = true;
      if (r.reason instanceof GoogleAuthError) anyAuth = true;
    }
  }

  if (anyAuth && items.length === 0) return { items: [], error: "auth" };
  if (anyFail && items.length === 0) return { items: [], error: "fetch" };
  if (anyFail) return { items, error: "partial" };
  return { items, error: null };
}

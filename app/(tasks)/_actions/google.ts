"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isConfigured,
  listCalendars,
  listEvents,
  type GoogleCalendarInfo,
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
  calendars: GoogleCalendarInfo[];
  selected: string[];
};

export async function listGoogleCalendarsAction(): Promise<ListCalendarsResult> {
  if (!isConfigured()) return { connected: false, calendars: [], selected: [] };
  try {
    const [calendars, selected] = await Promise.all([
      listCalendars(),
      getSelectedGoogleCalendars(),
    ]);
    return { connected: true, calendars, selected };
  } catch {
    return { connected: true, calendars: [], selected: [] };
  }
}

const idsSchema = z.array(z.string().min(1)).max(50);

export async function saveSelectedGoogleCalendarsAction(ids: string[]): Promise<void> {
  const parsed = idsSchema.parse(ids);
  await setSelectedGoogleCalendars(parsed);
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

  const results = await Promise.allSettled(
    selected.map((id) => listEvents(id, startISO, endISO)),
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

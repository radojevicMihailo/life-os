import "server-only";
import { taskDateHasTime } from "@/lib/calendar-date";
import { isConfigured, listEvents } from "@/lib/google/calendar";
import type { Reminder } from "./types";
// Only the query boundary is injected; production uses the shared pg pool.
type SourceDatabase = { query(sql: string, values?: Date[]): Promise<{ rows: Record<string, unknown>[] }> };
export async function collectReminders(database: SourceDatabase, now: Date): Promise<Reminder[]> {
  const horizon = new Date(now.getTime() + 30 * 60000);
  const { rows } = await database.query(`SELECT id,title,action_at,due_at FROM tasks
    WHERE status NOT IN ('done','canceled') AND
    ((action_at > $1 AND action_at <= $2) OR (due_at > $1 AND due_at <= $2))`, [now, horizon]);
  const result: Reminder[] = [];
  for (const row of rows) {
    const action = row.action_at ? new Date(row.action_at as string) : null;
    const due = row.due_at ? new Date(row.due_at as string) : null;
    for (const [date, type] of [[action, "task"], [due, "due"]] as const) {
      if (!date || Number.isNaN(date.getTime()) || date <= now || date > horizon || !taskDateHasTime(date)) continue;
      if (type === "due" && action?.getTime() === date.getTime()) continue;
      result.push({ key: `${type}:${row.id}`, title: String(row.title), startsAt: date, type, url: `/tasks/${encodeURIComponent(String(row.id))}` });
    }
  }
  if (!isConfigured()) return result;
  const settings = await database.query("SELECT google_calendar_ids FROM app_settings WHERE id=1");
  const calendars = settings.rows[0]?.google_calendar_ids;
  const selected = Array.isArray(calendars) ? [...new Set(calendars as string[])] : [];
  // Sequential requests keep the small Fly Machine's peak memory and sockets bounded.
  for (const raw of selected) {
    const match = /^(\d+):(.+)$/.exec(raw);
    const accountIdx = match ? Number(match[1]) : 0;
    const calendarId = match ? match[2] : raw;
    try {
      const events = await listEvents(calendarId, now.toISOString(), horizon.toISOString(), accountIdx);
      for (const event of events) {
        if (!event.hasTime) continue;
        const startsAt = new Date(event.startISO);
        if (Number.isNaN(startsAt.getTime()) || startsAt <= now || startsAt > horizon) continue;
        result.push({ key: `google:${event.id}`, title: event.summary, startsAt, type: "google", url: "/calendar" });
      }
    } catch { console.error("[push] Google reminders unavailable", { accountIdx }); }
  }
  return result;
}

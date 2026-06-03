import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fetchTasks } from "@/lib/tasks-query";
import { CalendarView, type CalendarItem } from "../_components/CalendarView";
import { GoogleCalendarButton } from "../_components/GoogleCalendarButton";
import {
  fetchGoogleEventsAction,
  listGoogleCalendarsAction,
} from "../_actions/google";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // Conservative range covering both week and month views from today's cursor.
  const now = new Date();
  const monthStart = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(now), { weekStartsOn: 1 });
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(addWeeks(weekStart, 1), -1);
  const rangeStart = monthStart < weekStart ? monthStart : weekStart;
  const rangeEnd = monthEnd > weekEnd ? monthEnd : weekEnd;

  const [tasks, gcal, gcalMeta] = await Promise.all([
    fetchTasks({ status: "all" }),
    fetchGoogleEventsAction(rangeStart.toISOString(), rangeEnd.toISOString()),
    listGoogleCalendarsAction(),
  ]);

  const items: CalendarItem[] = [];
  for (const t of tasks) {
    const due = t.dueAt ? new Date(t.dueAt) : null;
    const action = t.actionAt ? new Date(t.actionAt) : null;
    if (due) {
      items.push({
        id: `${t.id}:due`,
        taskId: t.id,
        title: t.title,
        status: t.status,
        kind: "due",
        source: "task",
        dateISO: due.toISOString(),
        hasTime: due.getHours() !== 0 || due.getMinutes() !== 0,
      });
    }
    if (action) {
      const actionEnd = t.actionEndAt ? new Date(t.actionEndAt) : null;
      items.push({
        id: `${t.id}:action`,
        taskId: t.id,
        title: t.title,
        status: t.status,
        kind: "action",
        source: "task",
        dateISO: action.toISOString(),
        endISO: actionEnd ? actionEnd.toISOString() : undefined,
        hasTime: action.getHours() !== 0 || action.getMinutes() !== 0,
      });
    }
  }
  for (const e of gcal.items) items.push(e);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      </header>
      <CalendarView
        items={items}
        toolbarExtras={<GoogleCalendarButton initialConnected={gcalMeta.connected} />}
      />
    </div>
  );
}

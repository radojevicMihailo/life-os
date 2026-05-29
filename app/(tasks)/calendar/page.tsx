import { fetchTasks } from "@/lib/tasks-query";
import { CalendarView, type CalendarItem } from "../_components/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const tasks = await fetchTasks({ status: "all" });

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
        dateISO: due.toISOString(),
        hasTime: due.getHours() !== 0 || due.getMinutes() !== 0,
      });
    }
    if (action) {
      items.push({
        id: `${t.id}:action`,
        taskId: t.id,
        title: t.title,
        status: t.status,
        kind: "action",
        dateISO: action.toISOString(),
        hasTime: action.getHours() !== 0 || action.getMinutes() !== 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      </header>
      <CalendarView items={items} />
    </div>
  );
}

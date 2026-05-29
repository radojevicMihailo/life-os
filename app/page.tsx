import { addDays, isBefore, startOfDay } from "date-fns";
import { fetchTasks } from "@/lib/tasks-query";
import { TaskList } from "./(tasks)/_components/TaskList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const all = await fetchTasks({ status: "open" });

  const now = new Date();
  const today = startOfDay(now);
  const horizon = addDays(today, 7);

  const visible = all.filter((t) => {
    if (!t.dueAt) return false;
    const due = t.dueAt instanceof Date ? t.dueAt : new Date(t.dueAt);
    return isBefore(due, horizon);
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Open tasks for the next 7 days · {visible.length} shown
        </p>
      </header>
      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nothing due in the next 7 days.
        </div>
      ) : (
        <TaskList tasks={visible} />
      )}
    </div>
  );
}

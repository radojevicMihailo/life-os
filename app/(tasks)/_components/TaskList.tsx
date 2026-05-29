import { groupBySection, sectionOrder, sectionLabels } from "@/lib/task-sections";
import { TaskRow, type TaskWithMeta } from "./TaskRow";

export function TaskList({ tasks }: { tasks: TaskWithMeta[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
        No tasks yet. Add one above.
      </div>
    );
  }

  const sections = groupBySection(tasks);

  return (
    <div className="space-y-6">
      {sectionOrder.map((key) => {
        const items = sections[key];
        if (items.length === 0) return null;
        return (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sectionLabels[key]}{" "}
              <span className="ml-1 text-muted-foreground/70">{items.length}</span>
            </h2>
            <div className="space-y-1">
              {items.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { groupBySection, sectionOrder, sectionLabels } from "@/lib/task-sections";
import { TaskRow, type TaskWithMeta } from "./TaskRow";

export type TaskListView = "grouped" | "flat";

export function TaskList({
  tasks,
  view = "grouped",
  query = "",
}: {
  tasks: TaskWithMeta[];
  view?: TaskListView;
  query?: string;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const hay = `${t.title} ${t.notes ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, query]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
        {query.trim() ? "No tasks match your search." : "No tasks yet. Add one above."}
      </div>
    );
  }

  if (view === "flat") {
    return (
      <div className="space-y-1">
        {filtered.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </div>
    );
  }

  const sections = groupBySection(filtered);

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

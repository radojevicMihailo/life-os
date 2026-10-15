"use client";

import type { TaskSort } from "@/lib/tasks-query";
import { TaskList, type TaskListView } from "./TaskList";
import { TasksToolbar } from "./TasksToolbar";
import type { TaskWithMeta } from "./TaskRow";

export function TasksTriageShell({
  tasks,
  view,
  sort,
  query = "",
}: {
  tasks: TaskWithMeta[];
  view: TaskListView;
  sort: TaskSort;
  query?: string;
}) {
  return (
    <div className="space-y-4">
      <TasksToolbar key={query} view={view} sort={sort} query={query} />
      <TaskList tasks={tasks} view={view} />
    </div>
  );
}

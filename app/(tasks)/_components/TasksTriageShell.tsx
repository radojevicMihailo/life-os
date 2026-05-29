"use client";

import { useState } from "react";
import type { TaskSort } from "@/lib/tasks-query";
import { TaskList, type TaskListView } from "./TaskList";
import { TasksToolbar } from "./TasksToolbar";
import type { TaskWithMeta } from "./TaskRow";

export function TasksTriageShell({
  tasks,
  view,
  sort,
}: {
  tasks: TaskWithMeta[];
  view: TaskListView;
  sort: TaskSort;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-4">
      <TasksToolbar view={view} sort={sort} query={query} onQueryChange={setQuery} />
      <TaskList tasks={tasks} view={view} query={query} />
    </div>
  );
}

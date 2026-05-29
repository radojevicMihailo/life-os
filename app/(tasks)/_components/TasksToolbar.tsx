"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, LayoutList, Rows3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskSort } from "@/lib/tasks-query";
import type { TaskListView } from "./TaskList";

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: "smart", label: "Smart" },
  { value: "due", label: "Due date" },
  { value: "created", label: "Created" },
  { value: "title", label: "Title" },
];

export function TasksToolbar({
  view,
  sort,
  query,
  onQueryChange,
}: {
  view: TaskListView;
  sort: TaskSort;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localQ, setLocalQ] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => onQueryChange(localQ), 250);
    return () => clearTimeout(t);
  }, [localQ, onQueryChange]);

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set(key, value);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="Search tasks…"
          className="pl-8"
          aria-label="Search tasks"
        />
      </div>
      <div className="inline-flex rounded-md border bg-card p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setParam("view", "grouped")}
          className={`flex items-center gap-1 rounded px-2 py-1 ${
            view === "grouped" ? "bg-accent text-foreground" : "text-foreground/70"
          }`}
          aria-pressed={view === "grouped"}
        >
          <Rows3 className="h-4 w-4" /> Grouped
        </button>
        <button
          type="button"
          onClick={() => setParam("view", "flat")}
          className={`flex items-center gap-1 rounded px-2 py-1 ${
            view === "flat" ? "bg-accent text-foreground" : "text-foreground/70"
          }`}
          aria-pressed={view === "flat"}
        >
          <LayoutList className="h-4 w-4" /> Flat
        </button>
      </div>
      <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

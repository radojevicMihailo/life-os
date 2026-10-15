"use client";

import { useState } from "react";
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
  { value: "smart", label: "Po važnosti" },
  { value: "due", label: "Rok" },
  { value: "created", label: "Datum unosa" },
  { value: "title", label: "Naslov" },
];

export function TasksToolbar({
  view,
  sort,
  query,
}: {
  view: TaskListView;
  sort: TaskSort;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localQ, setLocalQ] = useState(query);

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set(key, value);
    sp.delete("limit");
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={(event) => { event.preventDefault(); setParam("q", localQ); }} className="relative flex min-w-[200px] max-w-md flex-1 gap-2">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="Pretraži sve zadatke…"
          className="pl-8"
          aria-label="Pretraži zadatke"
        />
        <button className="min-h-11 rounded-xl border border-border px-3 text-sm hover:bg-accent" type="submit">Traži</button>
      </form>
      <div className="inline-flex rounded-2xl border border-border bg-card shadow-sm p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setParam("view", "grouped")}
          className={`flex items-center gap-1 rounded px-2 py-1 ${
            view === "grouped" ? "bg-accent text-foreground" : "text-foreground/70"
          }`}
          aria-pressed={view === "grouped"}
        >
          <Rows3 className="h-4 w-4" /> Grupisano
        </button>
        <button
          type="button"
          onClick={() => setParam("view", "flat")}
          className={`flex items-center gap-1 rounded px-2 py-1 ${
            view === "flat" ? "bg-accent text-foreground" : "text-foreground/70"
          }`}
          aria-pressed={view === "flat"}
        >
          <LayoutList className="h-4 w-4" /> Lista
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

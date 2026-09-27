"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { taskStatusColors } from "@/lib/status-colors";

const statuses = [
  { key: "active", label: "Active" },
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In progress" },
  { key: "waiting_for", label: "Waiting for" },
  { key: "done", label: "Done" },
  { key: "canceled", label: "Canceled" },
  { key: "all", label: "All" },
] as const;

export function StatusFilter() {
  const params = useSearchParams();
  const active = params.get("status") ?? "active";

  function withParam(value: string): string {
    const next = new URLSearchParams(params.toString());
    if (value === "active") next.delete("status");
    else next.set("status", value);
    const q = next.toString();
    return q ? `/tasks?${q}` : `/tasks`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Status:</span>
      {statuses.map((s) => (
        <Link key={s.key} href={withParam(s.key)} aria-current={active === s.key ? "page" : undefined}>
          <Badge variant="outline" className={`h-9 rounded-xl border px-3 text-sm ${taskStatusColors[s.key]} ${active === s.key ? "ring-2 ring-white/55 shadow-lg shadow-black/20" : "opacity-75 hover:opacity-100"}`}>{s.label}</Badge>
        </Link>
      ))}
    </div>
  );
}

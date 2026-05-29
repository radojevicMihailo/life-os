"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

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
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Status:</span>
      {statuses.map((s) => (
        <Link key={s.key} href={withParam(s.key)}>
          <Badge variant={active === s.key ? "default" : "outline"}>{s.label}</Badge>
        </Link>
      ))}
    </div>
  );
}

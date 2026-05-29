"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const statuses = [
  { key: "open", label: "Open" },
  { key: "done", label: "Done" },
  { key: "all", label: "All" },
] as const;

export function StatusFilter() {
  const params = useSearchParams();
  const active = params.get("status") ?? "open";

  function withParam(value: string): string {
    const next = new URLSearchParams(params.toString());
    if (value === "open") next.delete("status");
    else next.set("status", value);
    const q = next.toString();
    return q ? `/tasks?${q}` : `/tasks`;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Status:</span>
      {statuses.map((s) => (
        <Link key={s.key} href={withParam(s.key)}>
          <Badge variant={active === s.key ? "default" : "outline"}>{s.label}</Badge>
        </Link>
      ))}
    </div>
  );
}

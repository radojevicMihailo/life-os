"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { taskStatusColors } from "@/lib/status-colors";

const statuses = [
  { key: "active", label: "Aktivno" },
  { key: "backlog", label: "Na čekanju" },
  { key: "in_progress", label: "U toku" },
  { key: "waiting_for", label: "Čeka odgovor" },
  { key: "done", label: "Završeno" },
  { key: "canceled", label: "Otkazano" },
  { key: "all", label: "Sve" },
] as const;

export function StatusFilter() {
  const params = useSearchParams();
  const active = params.get("status") ?? "active";

  function withParam(value: string): string {
    const next = new URLSearchParams(params.toString());
    next.delete("limit");
    next.delete("page");
    if (value === "active") next.delete("status");
    else next.set("status", value);
    const q = next.toString();
    return q ? `/tasks?${q}` : `/tasks`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Status:</span>
      {statuses.map(({ key, label }) => {
        const selected = active === key;
        return (
          <Link key={key} href={withParam(key)} aria-current={selected ? "page" : undefined} className="rounded-xl underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Badge variant="outline" className={`h-10 rounded-xl px-3 text-sm font-semibold ${taskStatusColors[key]} ${selected ? "ring-2 ring-current" : ""}`}>
              {selected && <Check aria-hidden />}
              {label}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}

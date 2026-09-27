"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { goalStatusLabel, type GoalStatus } from "@/db/schema/goals";
import { goalStatusColors } from "@/lib/status-colors";

const STATUSES: (GoalStatus | "all")[] = ["all", "active", "done", "paused", "canceled"];

export function GoalsStatusFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("status") ?? "active";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Status:</span>
      {STATUSES.map((s) => {
        const sp = new URLSearchParams(params);
        if (s === "active") sp.delete("status");
        else sp.set("status", s);
        const href = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
        const active = current === s;
        return (
          <Link
            key={s}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <Badge variant="outline" className={`h-9 rounded-xl border px-3 text-sm ${s === "all" ? "border-violet-400/70 bg-violet-500/20 text-violet-100" : goalStatusColors[s]} ${active ? "ring-2 ring-white/55 shadow-lg shadow-black/20" : "opacity-75 hover:opacity-100"}`}>
              {s === "all" ? "All" : goalStatusLabel[s]}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}

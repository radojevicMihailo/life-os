"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { goalStatusLabel, type GoalStatus } from "@/db/schema/goals";

const STATUSES: (GoalStatus | "all")[] = ["all", "active", "done", "paused", "canceled"];

export function GoalsStatusFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("status") ?? "active";

  return (
    <div className="flex flex-wrap items-center gap-1">
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
            className={`rounded border px-2 py-0.5 text-xs ${
              active ? "bg-primary text-primary-foreground border-primary" : "bg-card"
            }`}
          >
            {s === "all" ? "All" : goalStatusLabel[s]}
          </Link>
        );
      })}
    </div>
  );
}

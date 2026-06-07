"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type GoalHorizon,
  goalHorizonLabel,
  goalHorizonOrder,
} from "@/db/schema/goals";

export function GoalsHorizonTabs({ counts }: { counts: Record<GoalHorizon, number> }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get("horizon") as GoalHorizon | null) ?? "yearly";

  return (
    <div className="flex flex-wrap items-center gap-1 border-b">
      {goalHorizonOrder.map((h) => {
        const sp = new URLSearchParams(params);
        if (h === "yearly") sp.delete("horizon");
        else sp.set("horizon", h);
        const href = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
        const active = current === h;
        return (
          <Link
            key={h}
            href={href}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {goalHorizonLabel[h]}
            <span className="ml-1 text-xs text-muted-foreground tabular-nums">
              {counts[h]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

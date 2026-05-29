"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function PriorityFilter({
  priorities,
}: {
  priorities: { id: string; name: string; color: string | null }[];
}) {
  const params = useSearchParams();
  const active = params.get("priority");

  function withParam(value: string | null): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("priority", value);
    else next.delete("priority");
    const q = next.toString();
    return q ? `/tasks?${q}` : `/tasks`;
  }

  if (priorities.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Priority:</span>
      <Link href={withParam(null)}>
        <Badge variant={active ? "outline" : "default"}>Any</Badge>
      </Link>
      {priorities.map((p) => (
        <Link key={p.id} href={withParam(p.id)}>
          <Badge
            variant={active === p.id ? "default" : "outline"}
            style={
              p.color && active === p.id ? { backgroundColor: p.color, color: "white" } : undefined
            }
          >
            {p.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

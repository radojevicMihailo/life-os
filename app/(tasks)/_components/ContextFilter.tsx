"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function ContextFilter({
  contexts,
}: {
  contexts: { id: string; name: string; color: string | null }[];
}) {
  const params = useSearchParams();
  const active = params.get("context");

  function withParam(value: string | null): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("context", value);
    else next.delete("context");
    const q = next.toString();
    return q ? `/tasks?${q}` : `/tasks`;
  }

  if (contexts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Context:</span>
      <Link href={withParam(null)}>
        <Badge variant={active ? "outline" : "default"}>All</Badge>
      </Link>
      {contexts.map((c) => (
        <Link key={c.id} href={withParam(c.id)}>
          <Badge
            variant={active === c.id ? "default" : "outline"}
            style={
              c.color && active === c.id ? { backgroundColor: c.color, color: "white" } : undefined
            }
          >
            {c.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function TagFilter({
  tags,
}: {
  tags: { id: string; name: string; color: string | null }[];
}) {
  const params = useSearchParams();
  const active = params.get("tag");

  function withParam(value: string | null): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("tag", value);
    else next.delete("tag");
    const q = next.toString();
    return q ? `/tasks?${q}` : `/tasks`;
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Tag:</span>
      <Link href={withParam(null)}>
        <Badge variant={active ? "outline" : "default"}>All</Badge>
      </Link>
      {tags.map((t) => (
        <Link key={t.id} href={withParam(t.id)}>
          <Badge
            variant={active === t.id ? "default" : "outline"}
            style={
              t.color && active === t.id ? { backgroundColor: t.color, color: "white" } : undefined
            }
          >
            {t.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

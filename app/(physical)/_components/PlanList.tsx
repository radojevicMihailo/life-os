import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { PlanListRow } from "@/lib/queries/physical";
import type { ActivityTag } from "@/db/schema/physical";

export function PlanList({ rows, tags }: { rows: PlanListRow[]; tags: ActivityTag[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No plans yet.</p>;
  const tagById = new Map(tags.map((t) => [t.id, t]));
  return (
    <ul className="space-y-2">
      {rows.map((p) => {
        const tagNames = p.tagIds
          .map((id) => tagById.get(id)?.name)
          .filter((n): n is string => Boolean(n));
        return (
          <li key={p.id}>
            <Link href={`/plans/${p.id}`}>
              <Card className="px-4 py-3 hover:bg-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    {tagNames.length > 0 ? (
                      <div className="text-xs text-muted-foreground">{tagNames.join(" · ")}</div>
                    ) : null}
                  </div>
                </div>
                {p.notes ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>
                ) : null}
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

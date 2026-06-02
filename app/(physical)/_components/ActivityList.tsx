import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ActivityListRow } from "@/lib/queries/physical";
import type { ActivityTag } from "@/db/schema/physical";

export function ActivityList({
  rows,
  tags,
}: {
  rows: ActivityListRow[];
  tags: ActivityTag[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No activities yet.</p>;
  }
  const tagById = new Map(tags.map((t) => [t.id, t]));
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const tagNames = r.tagIds
          .map((id) => tagById.get(id)?.name)
          .filter((n): n is string => Boolean(n));
        const label = tagNames.length > 0 ? tagNames.join(" · ") : "Untagged";
        return (
          <li key={r.id}>
            <Link href={`/activities/${r.id}`}>
              <Card className="px-4 py-3 hover:bg-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.performedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.subrowCount} {r.subrowCount === 1 ? "row" : "rows"}
                  </div>
                </div>
                {r.comment ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.comment}</p>
                ) : null}
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

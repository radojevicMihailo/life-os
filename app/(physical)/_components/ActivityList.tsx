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
    return <p className="text-sm text-muted-foreground">Još nema aktivnosti.</p>;
  }
  const tagById = new Map(tags.map((t) => [t.id, t]));
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const tagNames = r.tagIds
          .map((id) => tagById.get(id)?.name)
          .filter((n): n is string => Boolean(n));
        const label = r.title || ({running:"Trčanje",gym:"Teretana",mixed:"Kombinovani trening"}[r.mode]);
        return (
          <li key={r.id}>
            <Card className="relative px-4 py-3 pr-24 hover:bg-accent">
              <Link href={`/activities/${r.id}`} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Pregled treninga: ${label}`} />
              <Link href={`/activities/${r.id}/edit`} className="absolute right-4 top-4 z-10 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Izmeni trening: ${label}`}>Izmeni</Link>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.performedAt).toLocaleString("sr-RS")}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.stravaUrl ? "Strava · " : ""}
                    {r.subrowCount} delova
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{tagNames.join(" · ")}</p>
                <p className="mt-2 text-sm">{[r.summary.distanceKm > 0 ? `${r.summary.distanceComplete ? "" : "Uneseno: "}${new Intl.NumberFormat("sr-RS").format(r.summary.distanceKm)} km` : null,r.summary.exerciseCount > 0 ? `${r.summary.exerciseCount} vežbi · ${r.summary.setCount} serija` : null].filter(Boolean).join(" · ")}</p>
                {r.comment ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.comment}</p>
                ) : null}
              </Card>
          </li>
        );
      })}
    </ul>
  );
}

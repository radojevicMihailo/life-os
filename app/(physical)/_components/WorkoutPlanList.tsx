import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { WorkoutPlanListRow } from "@/lib/queries/physical";

export function WorkoutPlanList({ rows }: { rows: WorkoutPlanListRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No workout plans yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((p) => (
        <li key={p.id}>
          <Link href={`/plans/workouts/${p.id}`}>
            <Card className="px-4 py-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.exerciseCount} exercise{p.exerciseCount === 1 ? "" : "s"}
                </div>
              </div>
              {p.notes ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>
              ) : null}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

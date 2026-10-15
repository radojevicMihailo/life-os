import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { SplitListRow } from "@/lib/queries/physical";

export function SplitList({ rows }: { rows: SplitListRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Još nema ciklusa treninga.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((s) => (
        <li key={s.id}>
          <Link href={`/plans/splits/${s.id}`}>
            <Card className="px-4 py-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.dayCount} {s.dayCount % 10 === 1 && s.dayCount % 100 !== 11 ? "dan" : "dana"}
                </div>
              </div>
              {s.notes ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.notes}</p>
              ) : null}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

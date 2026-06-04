import { cn } from "@/lib/utils";

type Targets = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type Totals = { kcal: number; protein: number; carbs: number; fat: number };

const ROWS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: "kcal", label: "kcal", unit: "" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

export function TargetsBar({
  totals,
  targets,
}: {
  totals: Totals;
  targets: Targets;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {ROWS.map((r) => {
        const total = totals[r.key as keyof Totals];
        const target = targets[r.key];
        const pct = target ? Math.min(100, (total / target) * 100) : 0;
        return (
          <div key={r.key} className="border rounded p-3">
            <div className="text-xs text-muted-foreground">{r.label}</div>
            <div className="text-lg font-medium">
              {Math.round(total)}
              {target !== null && (
                <span className="text-sm text-muted-foreground">
                  {" "}/ {target}
                </span>
              )}
              {r.unit && <span className="text-sm">{r.unit}</span>}
            </div>
            {target !== null && (
              <div className="h-1.5 bg-muted rounded mt-2">
                <div
                  className={cn(
                    "h-full rounded",
                    total > target * 1.1 ? "bg-red-500" : "bg-green-500",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

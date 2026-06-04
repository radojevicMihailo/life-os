import Link from "next/link";
import {
  addDays,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";

export function CalendarGrid({
  month,
  kcalByDate,
  kcalTarget,
}: {
  month: Date;
  kcalByDate: Record<string, number>;
  kcalTarget: number | null;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const leading = (getDay(start) + 6) % 7;
  const cells: { date: Date | null; key: string }[] = [];
  for (let i = 0; i < leading; i++) cells.push({ date: null, key: `pre-${i}` });
  for (let d = 0; d < end.getDate(); d++) {
    const day = addDays(start, d);
    cells.push({ date: day, key: format(day, "yyyy-MM-dd") });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `post-${cells.length}` });
  }

  function color(kcal: number): string {
    if (kcalTarget === null || kcalTarget === 0) return "bg-muted/30";
    const ratio = kcal / kcalTarget;
    if (ratio >= 0.9 && ratio <= 1.1) return "bg-green-500/30";
    if (ratio >= 0.75 && ratio <= 1.25) return "bg-amber-500/30";
    return "bg-red-500/30";
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="text-xs text-muted-foreground text-center pb-1">
          {d}
        </div>
      ))}
      {cells.map(({ date, key }) => {
        if (!date) return <div key={key} className="h-20" />;
        const k = format(date, "yyyy-MM-dd");
        const kcal = kcalByDate[k] ?? 0;
        return (
          <Link
            key={key}
            href={`/meals/${k}`}
            className={cn(
              "h-20 border rounded p-1 flex flex-col text-xs hover:ring-1 ring-foreground",
              kcal > 0 && color(kcal),
            )}
          >
            <div>{format(date, "d")}</div>
            {kcal > 0 && (
              <div className="mt-auto font-medium">
                {Math.round(kcal)} kcal
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

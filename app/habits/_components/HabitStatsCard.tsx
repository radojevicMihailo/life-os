import Link from "next/link";
import {format, parseISO} from "date-fns";
import { Flame, Trophy, Percent } from "lucide-react";
import type { Habit } from "@/db/schema/habits";

export function HabitStatsCard({
  habit,
  current,
  best,
  pct30,
  completed = false,
}: {
  habit: Habit;
  current: number;
  best: number;
  pct30: number;
  completed?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card shadow-sm px-3 py-2 text-xs">
      <div className="min-w-0 w-full sm:flex-1">
        <Link href={`/habits/${habit.id}/edit`} className="block truncate text-sm font-medium hover:underline">{habit.title}</Link>
        <p className="mt-1 text-xs text-muted-foreground">{format(parseISO(habit.startDate), "dd.MM.yyyy.")}{habit.endDate ? ` – ${format(parseISO(habit.endDate), "dd.MM.yyyy.")}` : " – u toku"}</p>
      </div>
      <Stat icon={<Flame className="h-3 w-3 text-orange-500" />} label={completed ? "završni niz" : "niz"} value={current} />
      <Stat icon={<Trophy className="h-3 w-3 text-amber-500" />} label="najbolji" value={best} />
      <Stat icon={<Percent className="h-3 w-3 text-emerald-500" />} label="30 dana" value={`${pct30}%`} />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border px-2 py-0.5">
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

import { Flame, Trophy, Percent } from "lucide-react";
import type { Habit } from "@/db/schema/habits";

export function HabitStatsCard({
  habit,
  current,
  best,
  pct30,
}: {
  habit: Habit;
  current: number;
  best: number;
  pct30: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs">
      <div className="min-w-0 flex-1 truncate text-sm font-medium">{habit.title}</div>
      <Stat icon={<Flame className="h-3 w-3 text-orange-500" />} label="streak" value={current} />
      <Stat icon={<Trophy className="h-3 w-3 text-amber-500" />} label="best" value={best} />
      <Stat icon={<Percent className="h-3 w-3 text-emerald-500" />} label="30d" value={`${pct30}%`} />
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

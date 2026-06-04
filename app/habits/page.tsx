import Link from "next/link";
import { and, gte, inArray, isNull } from "drizzle-orm";
import { Plus, Settings } from "lucide-react";
import { db } from "@/db";
import { habit, habitLog, type Habit, type HabitLog } from "@/db/schema/habits";
import { Button } from "@/components/ui/button";
import { HabitTodayRow } from "./_components/HabitTodayRow";
import { HabitWeekGrid } from "./_components/HabitWeekGrid";
import { HabitStatsCard } from "./_components/HabitStatsCard";
import { isoDate, lastNDays } from "@/lib/habits/date";
import { isScheduledOn } from "@/lib/habits/schedule";
import {
  buildLogMap,
  bestStreak,
  completionPct30d,
  currentStreak,
} from "@/lib/habits/stats";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const today = new Date();
  const todayIso = isoDate(today);
  const days = lastNDays(7, today);
  const earliestIso = isoDate(days[0]);
  const thirtyIso = isoDate(lastNDays(30, today)[0]);

  const habits: Habit[] = await db
    .select()
    .from(habit)
    .where(isNull(habit.archivedAt))
    .orderBy(habit.sortOrder, habit.createdAt);

  const habitIds = habits.map((h) => h.id);

  const weekLogs: HabitLog[] =
    habitIds.length > 0
      ? await db
          .select()
          .from(habitLog)
          .where(and(inArray(habitLog.habitId, habitIds), gte(habitLog.date, earliestIso)))
      : [];

  const wideLogs: HabitLog[] =
    habitIds.length > 0
      ? await db
          .select()
          .from(habitLog)
          .where(and(inArray(habitLog.habitId, habitIds), gte(habitLog.date, thirtyIso)))
      : [];

  const weekByHabit = new Map<string, HabitLog[]>();
  const wideByHabit = new Map<string, HabitLog[]>();
  for (const h of habits) {
    weekByHabit.set(h.id, []);
    wideByHabit.set(h.id, []);
  }
  for (const l of weekLogs) weekByHabit.get(l.habitId)?.push(l);
  for (const l of wideLogs) wideByHabit.get(l.habitId)?.push(l);

  const scheduledToday = habits.filter((h) => isScheduledOn(h, today, todayIso));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Habits</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href="/habits/manage">
              <Settings className="h-4 w-4" />
              Manage
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1">
            <Link href="/habits/new">
              <Plus className="h-4 w-4" />
              New habit
            </Link>
          </Button>
        </div>
      </header>

      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No habits yet.{" "}
          <Link href="/habits/new" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Today · {scheduledToday.length}
            </h2>
            {scheduledToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
            ) : (
              scheduledToday.map((h) => {
                const map = buildLogMap(wideByHabit.get(h.id) ?? []);
                return (
                  <HabitTodayRow
                    key={h.id}
                    habit={h}
                    isoToday={todayIso}
                    count={map.get(todayIso)}
                    streak={currentStreak(h, map, today)}
                  />
                );
              })
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Last 7 days</h2>
            <div className="space-y-1.5 rounded-md border bg-card p-3">
              {habits.map((h) => (
                <HabitWeekGrid
                  key={h.id}
                  habit={h}
                  days={days}
                  logs={buildLogMap(weekByHabit.get(h.id) ?? [])}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Stats</h2>
            <div className="space-y-1.5">
              {habits.map((h) => {
                const map = buildLogMap(wideByHabit.get(h.id) ?? []);
                return (
                  <HabitStatsCard
                    key={h.id}
                    habit={h}
                    current={currentStreak(h, map, today)}
                    best={bestStreak(h, map, today)}
                    pct30={completionPct30d(h, map, today)}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

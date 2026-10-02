import Link from "next/link";
import { and, inArray, isNull, lte } from "drizzle-orm";
import { Plus } from "lucide-react";
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

  const habits: Habit[] = await db
    .select()
    .from(habit)
    .where(isNull(habit.archivedAt))
    .orderBy(habit.sortOrder, habit.createdAt);

  const habitIds = habits.map((h) => h.id);

  // Streaks need complete history; a 30-day query silently truncates long runs.
  const historyLogs: HabitLog[] =
    habitIds.length > 0
      ? await db
          .select()
          .from(habitLog)
          .where(and(inArray(habitLog.habitId, habitIds), lte(habitLog.date, todayIso)))
      : [];

  const historyByHabit = new Map<string, HabitLog[]>();
  for (const h of habits) historyByHabit.set(h.id, []);
  for (const log of historyLogs) historyByHabit.get(log.habitId)?.push(log);

  const scheduledToday = habits.filter((h) => isScheduledOn(h, today, todayIso));

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Navike</h1>
        <Button asChild size="sm" className="gap-1">
          <Link href="/habits/new">
            <Plus className="h-4 w-4" />
            Nova navika
          </Link>
        </Button>
      </header>

      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Još nema navika.{" "}
          <Link href="/habits/new" className="underline">
            Dodaj prvu
          </Link>
          .
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Danas · {scheduledToday.length}
            </h2>
            {scheduledToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Danas nema planiranih navika.</p>
            ) : (
              scheduledToday.map((h) => {
                const map = buildLogMap(historyByHabit.get(h.id) ?? []);
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
            <h2 className="text-sm font-semibold text-muted-foreground">Poslednjih 7 dana</h2>
            <div className="space-y-1.5 rounded-2xl border border-border bg-card shadow-sm p-3">
              {habits.map((h) => (
                <HabitWeekGrid
                  key={h.id}
                  habit={h}
                  days={days}
                  logs={buildLogMap(historyByHabit.get(h.id) ?? [])}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Statistika</h2>
            <div className="space-y-1.5">
              {habits.map((h) => {
                const map = buildLogMap(historyByHabit.get(h.id) ?? []);
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

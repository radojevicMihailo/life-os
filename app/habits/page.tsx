import { belgradeCalendarDate } from "@/lib/day";
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
import { isCompleted, isScheduledOn } from "@/lib/habits/schedule";
import {
  buildLogMap,
  bestStreak,
  completionPct30d,
  currentStreak,
} from "@/lib/habits/stats";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const today = belgradeCalendarDate();
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

  const statistics = new Map(habits.map((h) => {
    const logs = buildLogMap(historyByHabit.get(h.id) ?? []);
    return [h.id, { logs, current: currentStreak(h, logs, today), best: bestStreak(h, logs, today), pct30: completionPct30d(h, logs, today) }];
  }));

  const active = habits.filter(h => !isCompleted(h, todayIso));
  const completed = habits.filter(h => isCompleted(h, todayIso));
  const scheduledToday = active.filter((h) => isScheduledOn(h, today, todayIso));

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
          <section className="space-y-6" aria-labelledby="active-habits">
            <h2 id="active-habits" className="text-xl font-semibold">Aktivne navike · {active.length}</h2>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Danas · {scheduledToday.length}
            </h3>
            {scheduledToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Danas nema planiranih navika.</p>
            ) : (
              scheduledToday.map((h) => {
                const stats = statistics.get(h.id)!;
                return (
                  <HabitTodayRow
                    key={`${h.id}:${todayIso}:${stats.logs.get(todayIso) ?? 0}`}
                    habit={h}
                    isoToday={todayIso}
                    count={stats.logs.get(todayIso)}
                    streak={stats.current}
                  />
                );
              })
            )}
          </section>

          {active.length > 0 && <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Poslednjih 7 dana</h3>
            <div className="space-y-1.5 rounded-2xl border border-border bg-card shadow-sm p-3">
              {active.map((h) => (
                <HabitWeekGrid
                  key={h.id}
                  habit={h}
                  days={days}
                  logs={statistics.get(h.id)!.logs}
                />
              ))}
            </div>
          </section>}

          {active.length > 0 && <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Statistika</h3>
            <div className="space-y-1.5">
              {active.map((h) => {
                const stats = statistics.get(h.id)!;
                return (
                  <HabitStatsCard
                    key={h.id}
                    habit={h}
                    current={stats.current}
                    best={stats.best}
                    pct30={stats.pct30}
                  />
                );
              })}
            </div>
          </section>}
          </section>
          <section className="space-y-3" aria-labelledby="completed-habits">
            <h2 id="completed-habits" className="text-xl font-semibold">Završene navike · {completed.length}</h2>
            <p className="text-sm text-muted-foreground">Rezultati se računaju samo od početka do završetka navike. Procenat prikazuje poslednjih 30 dana njenog trajanja.</p>
            {completed.length === 0 ? <p className="text-sm text-muted-foreground">Nema završenih navika.</p> : completed.map(h => {
              const stats = statistics.get(h.id)!;
              return <HabitStatsCard key={h.id} habit={h} current={stats.current} best={stats.best} pct30={stats.pct30} completed />;
            })}
          </section>
        </>
      )}
    </div>
  );
}

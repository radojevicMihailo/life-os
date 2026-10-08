import {isoDate} from "@/lib/habits/date";
import {isCompleted} from "@/lib/habits/schedule";
import Link from "next/link";
import { asc, isNotNull, isNull } from "drizzle-orm";
import { ChevronLeft, Plus } from "lucide-react";
import { db } from "@/db";
import { habit } from "@/db/schema/habits";
import { Button } from "@/components/ui/button";
import { HabitManageRow } from "../_components/HabitManageRow";

export const dynamic = "force-dynamic";

export default async function ManageHabitsPage() {
  const current = await db
    .select()
    .from(habit)
    .where(isNull(habit.archivedAt))
    .orderBy(asc(habit.sortOrder), asc(habit.createdAt));

  const todayIso = isoDate(new Date());
  const active = current.filter(h => !isCompleted(h, todayIso));
  const completed = current.filter(h => isCompleted(h, todayIso));

  const archived = await db
    .select()
    .from(habit)
    .where(isNotNull(habit.archivedAt))
    .orderBy(asc(habit.archivedAt));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/habits"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Nazad na navike
          </Link>
          <h1 className="text-2xl font-semibold">Upravljanje navikama</h1>
        </div>
        <Button asChild size="sm" className="gap-1">
          <Link href="/habits/new">
            <Plus className="h-4 w-4" />
            Nova navika
          </Link>
        </Button>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Aktivne navike</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema aktivnih navika.</p>
        ) : (
          active.map((h) => <HabitManageRow key={h.id} habit={h} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Završene navike</h2>
        {completed.length === 0 ? <p className="text-sm text-muted-foreground">Nema završenih navika.</p> : completed.map(h => <HabitManageRow key={h.id} habit={h} />)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Arhivirane navike</h2>
        {archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema arhiviranih navika.</p>
        ) : (
          archived.map((h) => <HabitManageRow key={h.id} habit={h} />)
        )}
      </section>
    </div>
  );
}

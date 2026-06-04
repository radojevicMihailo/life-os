import Link from "next/link";
import { asc, isNotNull, isNull } from "drizzle-orm";
import { ChevronLeft, Plus } from "lucide-react";
import { db } from "@/db";
import { habit } from "@/db/schema/habits";
import { Button } from "@/components/ui/button";
import { HabitManageRow } from "../_components/HabitManageRow";

export const dynamic = "force-dynamic";

export default async function ManageHabitsPage() {
  const active = await db
    .select()
    .from(habit)
    .where(isNull(habit.archivedAt))
    .orderBy(asc(habit.sortOrder), asc(habit.createdAt));

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
            <ChevronLeft className="h-3.5 w-3.5" /> Back to habits
          </Link>
          <h1 className="text-2xl font-semibold">Manage habits</h1>
        </div>
        <Button asChild size="sm" className="gap-1">
          <Link href="/habits/new">
            <Plus className="h-4 w-4" />
            New habit
          </Link>
        </Button>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Active</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active habits.</p>
        ) : (
          active.map((h) => <HabitManageRow key={h.id} habit={h} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Archived</h2>
        {archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">No archived habits.</p>
        ) : (
          archived.map((h) => <HabitManageRow key={h.id} habit={h} />)
        )}
      </section>
    </div>
  );
}

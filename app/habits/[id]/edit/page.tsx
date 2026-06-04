import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { habit } from "@/db/schema/habits";
import { HabitForm } from "../../_components/HabitForm";

export const dynamic = "force-dynamic";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row] = await db.select().from(habit).where(eq(habit.id, id)).limit(1);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link
          href="/habits"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to habits
        </Link>
        <h1 className="text-2xl font-semibold">Edit habit</h1>
      </header>
      <HabitForm mode="edit" habit={row} />
    </div>
  );
}

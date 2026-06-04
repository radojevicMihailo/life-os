import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HabitForm } from "../_components/HabitForm";

export const dynamic = "force-dynamic";

export default function NewHabitPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link
          href="/habits"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to habits
        </Link>
        <h1 className="text-2xl font-semibold">New habit</h1>
      </header>
      <HabitForm mode="create" />
    </div>
  );
}

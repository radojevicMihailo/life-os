import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTagGroups, getTags, getWorkoutPlans } from "@/lib/queries/physical";
import { SplitForm } from "../../../_components/SplitForm";

export const dynamic = "force-dynamic";

export default async function NewSplitPage() {
  const [tagGroups, tags, workoutPlans] = await Promise.all([
    getTagGroups(),
    getTags(),
    getWorkoutPlans(),
  ]);
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <Link href="/plans/splits" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Splits
      </Link>
      <h1 className="text-2xl font-semibold">New split</h1>
      <SplitForm tagGroups={tagGroups} tags={tags} workoutPlans={workoutPlans} />
    </div>
  );
}

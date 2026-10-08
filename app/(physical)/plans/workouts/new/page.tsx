import Link from "next/link";
import {ChevronLeft} from "lucide-react";
import {getRecordingCatalog} from "@/lib/queries/physical";
import {WorkoutPlanForm} from "../../../_components/WorkoutPlanForm";
export const dynamic="force-dynamic";
export default async function NewWorkoutPlanPage(){
 const catalog=await getRecordingCatalog();
 return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"><Link href="/plans/workouts" className="inline-flex items-center text-sm text-muted-foreground hover:underline"><ChevronLeft className="size-4"/>Šabloni treninga</Link><h1 className="text-2xl font-semibold">Novi šablon treninga</h1><WorkoutPlanForm {...catalog}/></div>;
}

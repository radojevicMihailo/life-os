import Link from "next/link";
import {notFound} from "next/navigation";
import {ChevronLeft,Play} from "lucide-react";
import {getRecordingCatalog,getWorkoutPlan} from "@/lib/queries/physical";
import {resolvePlanBlocks} from "@/lib/physical/planAdapter";
import {Button} from "@/components/ui/button";
import {WorkoutPlanForm} from "../../../_components/WorkoutPlanForm";
export const dynamic="force-dynamic";
export default async function EditWorkoutPlanPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,data=await getWorkoutPlan(id);if(!data)notFound();
 const blocks=resolvePlanBlocks(data.plan.blocks,data.exercises);
 const catalog=await getRecordingCatalog(blocks.items.flatMap(b=>b.exerciseId?[b.exerciseId]:[]));
 return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"><Link href="/plans/workouts" className="inline-flex items-center text-sm text-muted-foreground hover:underline"><ChevronLeft className="size-4"/>Šabloni treninga</Link><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{data.plan.name}</h1>{!data.plan.archivedAt&&<Button asChild size="sm"><Link href={`/activities/new?source=plan:${id}`}><Play className="mr-2 size-4"/>Zabeleži iz plana</Link></Button>}</div><WorkoutPlanForm {...catalog} initial={{id,name:data.plan.name,notes:data.plan.notes,archivedAt:data.plan.archivedAt,blocks}}/></div>;
}

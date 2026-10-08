"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import type {PlanBlocks,TrainingBlock,EntryMode} from "@/lib/physical/types";
import {newBlock,inferEntryMode} from "@/lib/physical/blocks";
import {draftFromPlan,planFromActivity} from "@/lib/physical/drafts";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {BlockEditor,type BlockCatalog} from "./activity/BlockEditor";
import {TagSelection} from "./TagSelection";
import {createWorkoutPlan,updateWorkoutPlan,archiveWorkoutPlan,deleteWorkoutPlan} from "../_actions/workoutPlans";
export type WorkoutPlanInitial={id?:string;name:string;notes:string|null;blocks:PlanBlocks;archivedAt?:Date|null};
export function WorkoutPlanForm({initial,...catalog}:BlockCatalog&{initial?:WorkoutPlanInitial}){
 const router=useRouter(),[pending,startTransition]=useTransition(),[name,setName]=useState(initial?.name??""),[notes,setNotes]=useState(initial?.notes??""),[tagIds,setTagIds]=useState(initial?.blocks.tagIds??[]),[blocks,setBlocks]=useState<TrainingBlock[]>(()=>initial?draftFromPlan({name:initial.name,notes:initial.notes,tagIds:[],blocks:initial.blocks},new Date()).blocks:[newBlock("exercise")]),[error,setError]=useState("");
 const mode:EntryMode=inferEntryMode(blocks,"gym");
 function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError("");startTransition(async()=>{
 const payload={name,notes:notes||null,blocks:planFromActivity({title:name,performedAt:new Date(),values:{},comment:notes||null,stravaUrl:null,tagIds,blocks},false)};
 try{const result=initial?.id?await updateWorkoutPlan(initial.id,payload):await createWorkoutPlan(payload);if(!result.ok){setError(result.error);return;}router.push("/plans/workouts");router.refresh();}catch{setError("Šablon nije sačuvan. Unos ostaje u formi.");}
 });}
 function archive(){if(!initial?.id)return;startTransition(async()=>{const result=await archiveWorkoutPlan(initial.id!);if(!result.ok){setError(result.error);return;}router.push("/plans/workouts");router.refresh();});}
 function destroy(){if(!initial?.id||!confirm("Obrisati ovaj šablon?"))return;startTransition(async()=>{const result=await deleteWorkoutPlan(initial.id!);if(!result.ok){setError(result.error);return;}router.push("/plans/workouts");router.refresh();});}
 return <form onSubmit={submit} className="space-y-6"><label className="block space-y-2 text-sm font-medium">Naziv šablona<Input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Na primer: Tempo + čučanj"/></label><label className="block space-y-2 text-sm font-medium">Cilj i uputstva<Textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Okvir treninga, napomene, opcioni delovi…"/></label><TagSelection groups={catalog.tagGroups} tags={catalog.tags} selectedIds={tagIds} context={{scope:"session",mode}} onChange={setTagIds}/><p className="text-sm text-muted-foreground">Plan čuva ciljeve i redosled. Ostvarene rezultate unosiš kada zabeležiš trening.</p><BlockEditor sessionTagIds={tagIds} {...catalog} blocks={blocks} onChange={setBlocks} mode="template"/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="sticky bottom-0 flex flex-wrap justify-between gap-2 border-t bg-background/95 py-4 backdrop-blur"><div>{initial?.id&&<><Button type="button" variant="ghost" disabled={pending} onClick={archive}>Arhiviraj</Button><Button type="button" variant="ghost" disabled={pending} className="text-destructive" onClick={destroy}>Obriši</Button></>}</div><Button type="submit" disabled={pending||!name.trim()}>{pending?"Čuvanje…":"Sačuvaj šablon"}</Button></div></form>;
}

"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {Dumbbell,Footprints,Layers,Check} from "lucide-react";
import type {PhysicalField} from "@/db/schema/physical";
import type {ActivityDraft,EntryMode,SourceOption} from "@/lib/physical/types";
import {newBlock,inferEntryMode,toActivityWrite} from "@/lib/physical/blocks";
import {summarizeActivity} from "@/lib/physical/activitySummary";
import {localDateValue} from "@/lib/physical/input";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {createActivity,updateActivity,deleteActivity} from "../../_actions/activities";
import {TagSelection} from "../TagSelection";
import {BlockEditor,type BlockCatalog} from "./BlockEditor";
import {CustomFields} from "./CustomFields";
import {SourcePicker} from "./SourcePicker";
import {SaveTemplateDialog} from "./SaveTemplateDialog";
import {ActivityMetrics} from "./ActivityMetrics";
export type ActivityFormProps=BlockCatalog&{topFields:PhysicalField[];initial?:ActivityDraft;sources?:SourceOption[];requestedSource?:string};
export function ActivityForm({initial,topFields,sources=[],requestedSource,...catalog}:ActivityFormProps){
 const router=useRouter(),[pending,startTransition]=useTransition();
 const [draft,setDraft]=useState<ActivityDraft>(()=>initial??{title:null,performedAt:new Date(),values:{},comment:null,stravaUrl:null,tagIds:[],blocks:[newBlock("split")]});
 const [fallbackMode,setFallbackMode]=useState<EntryMode>("running"),[errors,setErrors]=useState<Record<string,string>>({}),[error,setError]=useState("");
 const [dirty,setDirty]=useState(false),[generation,setGeneration]=useState(0);
 const mode=inferEntryMode(draft.blocks,fallbackMode),summary=summarizeActivity(draft.blocks);
 function patch(next:Partial<ActivityDraft>){setDirty(true);setDraft(d=>({...d,...next}));setErrors({});setError("");}
 function chooseMode(next:EntryMode){setFallbackMode(next);const pristine=draft.blocks.length<=1&&draft.blocks.every(b=>!b.id&&!b.exerciseId&&!Object.keys(b.values).length&&!b.tagIds.length&&!b.details.label&&!b.details.note&&!Object.keys(b.details.targets).length&&!b.details.optional);if(pristine)patch({blocks:next==="mixed"?[]:[newBlock(next==="gym"?"exercise":"split")]});}
 function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError("");setErrors({});startTransition(async()=>{
  try {const result=draft.id?await updateActivity(draft.id,toActivityWrite(draft)):await createActivity(toActivityWrite(draft));if(!result.ok){setError(result.error);setErrors(result.fieldErrors??{});return;}router.push(draft.id?`/activities/${draft.id}`:"/activities");router.refresh();}catch{setError("Čuvanje nije uspelo. Unos je sačuvan u formi; pokušaj ponovo.");}
 });}
 function destroy(){if(!draft.id||!confirm("Obrisati ovu aktivnost?"))return;startTransition(async()=>{const result=await deleteActivity(draft.id!);if(!result.ok){setError(result.error);return;}router.push("/activities");router.refresh();});}
 const choices=[{key:"running",label:"Trčanje",description:"Kilometri i vreme",icon:Footprints},{key:"gym",label:"Teretana",description:"Vežbe i serije",icon:Dumbbell},{key:"mixed",label:"Kombinovano",description:"Trčanje i vežbe",icon:Layers}] as const;
 return <form onChangeCapture={()=>setDirty(true)} onSubmit={submit} onInvalidCapture={event=>{const target=event.target as HTMLElement;const card=target.closest("[data-block]");const button=card?.querySelector<HTMLButtonElement>('button[aria-expanded="false"]');button?.click();const details=target.closest("details");if(details)details.open=true;setError("Proveri označena polja; uneti podaci ostaju u formi.");}} className="space-y-6 pb-8">
 <div className="flex flex-wrap items-center justify-between gap-2"><SourcePicker sources={sources} groups={catalog.tagGroups} tags={catalog.tags} exercises={catalog.exercises} dirty={dirty} initialSourceId={requestedSource} onApply={next=>{setDraft(next);setGeneration(g=>g+1);setDirty(false);setErrors({});setError("");}}/>{draft.id&&<SaveTemplateDialog draft={draft}/>}</div>
 <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Vrsta treninga">{choices.map(choice=><button key={choice.key} type="button" aria-pressed={mode===choice.key} onClick={()=>chooseMode(choice.key)} className={`min-w-0 rounded-2xl border p-3 text-left transition-colors sm:p-4 ${mode===choice.key?"border-primary bg-primary/10":"bg-card hover:bg-accent"}`}><choice.icon className={`mb-3 size-5 ${mode===choice.key?"text-primary":"text-muted-foreground"}`}/><span className="block break-words text-xs font-semibold sm:text-sm">{choice.label}</span><span className="mt-1 hidden text-xs text-muted-foreground sm:block">{choice.description}</span></button>)}</div>
 <div className="grid gap-4 sm:grid-cols-[1fr_2fr]"><label className="block space-y-2 text-sm font-medium">Datum<Input type="date" value={localDateValue(draft.performedAt)} required onChange={e=>{if(e.target.value)patch({performedAt:new Date(`${e.target.value}T12:00:00`)});}}/></label><label className="block space-y-2 text-sm font-medium">Naziv treninga <span className="font-normal text-muted-foreground">(opciono)</span><Input value={draft.title??""} placeholder={mode==="running"?"Na primer: Tempo trčanje":"Na primer: Upper 1"} maxLength={200} onChange={e=>patch({title:e.target.value||null})}/></label></div>
 <TagSelection groups={catalog.tagGroups} tags={catalog.tags} selectedIds={draft.tagIds} context={{scope:"session",mode}} onChange={tagIds=>patch({tagIds})}/>
 <div className="space-y-3"><div><h2 className="text-lg font-semibold">Tvoj trening</h2><p className="text-sm text-muted-foreground">Dodaj delove redom kojim si ih radio.</p></div><BlockEditor sessionTagIds={draft.tagIds} key={generation} {...catalog} blocks={draft.blocks} onChange={blocks=>patch({blocks})} mode="actual" errors={errors}/></div>
 <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Beleška, Strava i dodatni podaci</summary><div className="mt-4 space-y-4"><label className="block space-y-2 text-sm">Beleška<Textarea value={draft.comment??""} onChange={e=>patch({comment:e.target.value||null})}/></label><label className="block space-y-2 text-sm">Strava link<Input type="url" value={draft.stravaUrl??""} placeholder="https://www.strava.com/activities/…" onChange={e=>patch({stravaUrl:e.target.value||null})}/></label><CustomFields fields={topFields} values={draft.values} onChange={values=>patch({values})} groups={catalog.exerciseGroups} exercises={catalog.exercises}/></div></details>
 <ActivityMetrics summary={summary}/>{draft.blocks.some(b=>b.details.status==="pending")&&<p className="text-xs text-muted-foreground">Delovi „Za unos“ i „Preskočeno“ ne ulaze u ostvarene rezultate.</p>}{error&&<p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
 <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-1 py-4 backdrop-blur"><div>{draft.id&&<Button type="button" variant="ghost" className="text-destructive" disabled={pending} onClick={destroy}>Obriši</Button>}</div><div className="flex gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={()=>router.back()}>Otkaži</Button><Button type="submit" disabled={pending}><Check className="mr-2 size-4"/>{pending?"Čuvanje…":"Sačuvaj aktivnost"}</Button></div></div>
 </form>;
}

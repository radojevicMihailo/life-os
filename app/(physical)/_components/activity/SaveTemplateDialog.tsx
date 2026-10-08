"use client";
import {useState,useTransition} from "react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import type {ActivityDraft} from "@/lib/physical/types";
import {planFromActivity} from "@/lib/physical/drafts";
import {createWorkoutPlan} from "../../_actions/workoutPlans";
import {blockKindLabels} from "@/lib/physical/display";
import {TargetSummary} from "./TargetSummary";
import {toast} from "sonner";
export function SaveTemplateDialog({draft}:{draft:ActivityDraft}){
 const [open,setOpen]=useState(false),[name,setName]=useState(draft.title??""),[useResults,setUseResults]=useState(false),[error,setError]=useState(""),[pending,startTransition]=useTransition();
 const blocks=planFromActivity(draft,useResults);
 return <><Button type="button" variant="outline" size="sm" onClick={()=>setOpen(true)}>Sačuvaj kao šablon</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Novi šablon treninga</DialogTitle><DialogDescription>Struktura je ista; ostvareni rezultati se ne prenose u novi trening.</DialogDescription></DialogHeader><label className="space-y-2 text-sm">Naziv šablona<Input value={name} maxLength={200} onChange={e=>setName(e.target.value)}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useResults} onChange={e=>setUseResults(e.target.checked)}/>Koristi ostvarene rezultate kao ciljeve</label><p className="text-xs text-muted-foreground">Ponavljanja i trajanje serija se prenose kao rasponi; težine i pojedinačne serije ostaju u originalnom treningu.</p><div className="space-y-2">{blocks.items.map((b,i)=><div key={i} className="rounded-xl border p-3"><p className="text-sm">{i+1}. {b.details.label||blockKindLabels[b.kind]}</p><TargetSummary targets={b.details.targets}/></div>)}</div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="button" disabled={pending||!name.trim()} onClick={()=>startTransition(async()=>{try{const result=await createWorkoutPlan({name,notes:draft.comment,blocks});if(!result.ok){setError(result.error);return;}toast.success("Šablon je sačuvan.");setOpen(false);}catch{setError("Šablon nije sačuvan. Pokušaj ponovo.");}})}>{pending?"Čuvanje…":"Sačuvaj šablon"}</Button></DialogContent></Dialog></>;
}

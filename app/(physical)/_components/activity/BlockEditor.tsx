"use client";
import {describeBlock} from "@/lib/physical/display";
import {supersetLabels} from "@/lib/physical/supersets";
import {Plus,Link2} from "lucide-react";
import type {Exercise,ExerciseGroup,PhysicalField,ActivityTag,ActivityTagGroup} from "@/db/schema/physical";
import type {TrainingBlock} from "@/lib/physical/types";
import {newBlock,moveBlock,removeBlock,duplicateBlock} from "@/lib/physical/blocks";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {TagSelection} from "../TagSelection";
import {BlockCard} from "./BlockCard";
import {RunFields} from "./RunFields";
import {IntervalFields} from "./IntervalFields";
import type {IntervalSegment} from "@/lib/physical/intervals";
import {SprintFields} from "./SprintFields";
import {ExercisePicker} from "./ExercisePicker";
import {ExerciseFields} from "./ExerciseFields";
import {CustomFields} from "./CustomFields";
import {TargetSummary} from "./TargetSummary";
import {NumberInput} from "./NumberInput";
export type BlockCatalog={exercises:Exercise[];exerciseGroups:ExerciseGroup[];tagGroups:ActivityTagGroup[];tags:ActivityTag[];subrowFields:PhysicalField[]};
export type BlockEditorProps=BlockCatalog&{blocks:TrainingBlock[];onChange:(blocks:TrainingBlock[])=>void;mode:"actual"|"template";errors?:Record<string,string>;sessionTagIds?:string[]};
const builtins=["segments","distance","duration","pace","sets","sprintDistance","sprintDuration","sprintReps","sprintRest"];
export function BlockEditor({blocks,onChange,mode,errors={},sessionTagIds=[],...catalog}:BlockEditorProps){
 const labels=supersetLabels(blocks);
 const update=(idx:number,block:TrainingBlock)=>onChange(blocks.map((b,i)=>i===idx?block:b));
 function values(idx:number,next:Record<string,unknown>){const block=blocks[idx];const hasResults=Object.values(next).some(v=>v!=null&&v!==""&&(!Array.isArray(v)||v.length>0));update(idx,{...block,values:next,details:{...block.details,status:hasResults?"done":"pending"}});}
 return <div className="space-y-4">{blocks.map((block,index)=>{const updateBlock=(next:TrainingBlock)=>update(index,next);const error=Object.entries(errors).find(([path])=>path.startsWith(`subrows.${index}.`))?.[1];return <div key={block.rowKey} className="space-y-2">{labels[index]&&<p className="text-xs font-medium text-muted-foreground">Superserija {labels[index]}</p>}<BlockCard title={catalog.exercises.find(e=>e.id===block.exerciseId)?.name} block={block} index={index} count={blocks.length} onMove={dir=>onChange(moveBlock(blocks,index,dir))} onRemove={()=>onChange(removeBlock(blocks,index))} onDuplicate={()=>onChange(duplicateBlock(blocks,index))} error={error}>
 {mode==="actual"&&<TargetSummary targets={block.details.targets}/>}
 {mode==="actual"&&block.kind==="interval"&&!!block.details.intervalTargets?.length&&<div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground"><p className="font-medium">Planirane deonice</p><pre className="mt-1 whitespace-pre-wrap font-sans">{describeBlock({...block,values:{segments:block.details.intervalTargets}})}</pre></div>}
 <TagSelection groups={catalog.tagGroups} tags={catalog.tags} selectedIds={block.tagIds} conditionIds={[...sessionTagIds,...block.tagIds]} context={{scope:"block",kind:block.kind}} onChange={tagIds=>updateBlock({...block,tagIds})}/>
 {mode==="actual"&&block.kind==="split"&&<RunFields block={block} onChange={next=>values(index,next)}/>}
 {mode==="actual"&&block.kind==="sprint"&&<SprintFields block={block} onChange={next=>values(index,next)}/>}
 {block.kind==="interval"&&<IntervalFields segments={mode==="actual"?(block.values.segments as IntervalSegment[]??[]):(block.details.intervalTargets??[])} onChange={segments=>mode==="actual"?values(index,{...block.values,segments}):updateBlock({...block,details:{...block.details,intervalTargets:segments}})}/>}
 {block.kind==="exercise"&&(mode==="actual"?<ExerciseFields block={block} exercises={catalog.exercises} groups={catalog.exerciseGroups} onChange={next=>values(index,next)} onExerciseChange={exerciseId=>updateBlock({...block,exerciseId})}/>:<ExercisePicker value={block.exerciseId} exercises={catalog.exercises} groups={catalog.exerciseGroups} placeholder="Izbor još nije zaključan" onChange={exerciseId=>updateBlock({...block,exerciseId})}/>)}
 {mode==="actual"&&<div className="flex flex-wrap gap-2" role="group" aria-label="Status dela">{([{key:"done",label:"Urađeno"},{key:"pending",label:"Za unos"},{key:"skipped",label:"Preskočeno"}] as const).map(status=><Button key={status.key} type="button" size="sm" variant={block.details.status===status.key?"secondary":"ghost"} aria-pressed={block.details.status===status.key} onClick={()=>updateBlock({...block,details:{...block.details,status:status.key}})}>{status.label}</Button>)}</div>}
 <details className="group" open={mode==="template"||undefined}><summary className="cursor-pointer text-sm font-medium text-muted-foreground">{mode==="template"?"Naziv i ciljevi":"Naziv, ciljevi i dodatni detalji"}</summary><div className="mt-4 space-y-4"><label className="block space-y-2 text-sm">Naziv dela<Input value={block.details.label??""} placeholder={block.kind==="split"?"Na primer: Zagrevanje":"Opcioni naziv"} onChange={e=>updateBlock({...block,details:{...block.details,label:e.target.value||null}})}/></label><label className="block space-y-2 text-sm">Beleška<Textarea value={block.details.note??""} placeholder="Uputstvo, osećaj, RIR…" onChange={e=>updateBlock({...block,details:{...block.details,note:e.target.value||null}})}/></label>{mode==="template"&&<TargetFields block={block} onChange={updateBlock}/>}{block.kind==="exercise"&&<NumberInput label="Pauza između serija" unit="s" integer value={block.details.restSec} onChange={restSec=>updateBlock({...block,details:{...block.details,restSec}})}/>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={block.details.optional} onChange={e=>updateBlock({...block,details:{...block.details,optional:e.target.checked}})}/>Opcioni deo treninga</label><CustomFields fields={catalog.subrowFields} exclude={builtins} values={block.values} onChange={next=>values(index,next)} groups={catalog.exerciseGroups} exercises={catalog.exercises}/></div></details>
 </BlockCard>{block.kind==="exercise"&&blocks[index+1]?.kind==="exercise"&&<div className="flex justify-center"><Button type="button" size="sm" variant={block.details.linkNext?"secondary":"ghost"} onClick={()=>updateBlock({...block,details:{...block.details,linkNext:!block.details.linkNext}})}><Link2 className="mr-2 size-3"/>{block.details.linkNext?"Povezano u superseriju":"Poveži u superseriju"}</Button></div>}</div>;})}<div className="rounded-xl border border-dashed p-4"><p className="mb-3 text-sm font-medium">Dodaj deo treninga</p><div className="flex flex-wrap gap-2">{([{kind:"split",label:"Trčanje"},{kind:"exercise",label:"Vežba"},{kind:"sprint",label:"Sprintovi"},{kind:"interval",label:"Intervali"}] as const).map(item=><Button key={item.kind} type="button" variant="outline" size="sm" onClick={()=>onChange([...blocks,{...newBlock(item.kind),sortOrder:blocks.length}])}><Plus className="mr-2 size-4"/>{item.label}</Button>)}</div></div></div>;
}
function TargetFields({block,onChange}:{block:TrainingBlock;onChange:(block:TrainingBlock)=>void}){
 if(block.kind==="interval")return null;
 const keys=block.kind==="split"?[{key:"distanceKm",label:"Distanca",unit:"km"},{key:"durationSec",label:"Trajanje",unit:"s"}]:block.kind==="sprint"?[{key:"repetitions",label:"Broj sprintova",unit:""},{key:"sprintDistanceM",label:"Distanca sprinta",unit:"m"},{key:"sprintDurationSec",label:"Trajanje sprinta",unit:"s"},{key:"restSec",label:"Pauza",unit:"s"}]:[{key:"setCount",label:"Broj serija",unit:""},{key:"reps",label:"Ponavljanja",unit:""},{key:"durationSec",label:"Trajanje serije",unit:"s"}];
 return <div className="space-y-4"><p className="text-xs text-muted-foreground">Ciljevi ostaju odvojeni od rezultata. Za fiksnu vrednost unesi isti minimum i maksimum.</p>{keys.map(f=>{const key=f.key as keyof TrainingBlock["details"]["targets"],range=block.details.targets[key];function set(side:"min"|"max",n:number|null){const targets={...block.details.targets};if(n==null)delete targets[key];else targets[key]={min:range?.min??n,max:range?.max??n,[side]:n};onChange({...block,details:{...block.details,targets}});}return <fieldset key={key}><legend className="mb-2 text-sm font-medium">{f.label} {f.unit&&`(${f.unit})`}</legend><div className="grid grid-cols-2 gap-3"><NumberInput label="Minimum" integer={key!=="distanceKm"} value={range?.min} onChange={n=>set("min",n)}/><NumberInput label="Maksimum" integer={key!=="distanceKm"} value={range?.max} onChange={n=>set("max",n)}/></div></fieldset>;})}</div>;
}

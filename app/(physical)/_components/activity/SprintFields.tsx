"use client";
import type {TrainingBlock} from "@/lib/physical/types";
import {NumberInput} from "./NumberInput";
export function SprintFields({block,onChange}:{block:TrainingBlock;onChange:(values:Record<string,unknown>)=>void}){
 const fields=[{key:"sprintReps",label:"Ponavljanja",unit:"",integer:true,min:1},{key:"sprintDistance",label:"Distanca po sprintu",unit:"m",integer:false,min:0.1},{key:"sprintDuration",label:"Trajanje po sprintu",unit:"s",integer:true,min:1},{key:"sprintRest",label:"Pauza između sprintova",unit:"s",integer:true,min:0}];
 return <div className="space-y-3"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields.map(f=><NumberInput key={f.key} label={f.label} unit={f.unit} integer={f.integer} min={f.min} value={block.values[f.key] as number|null} onChange={n=>onChange({...block.values,[f.key]:n})}/>)}</div><p className="text-xs text-muted-foreground">Dovoljan je broj ponavljanja i distanca ili trajanje sprinta. Pauza ne ulazi u aktivno vreme trčanja.</p></div>;
}

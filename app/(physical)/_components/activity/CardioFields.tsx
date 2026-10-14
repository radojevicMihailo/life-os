"use client";
import type {TrainingBlock} from "@/lib/physical/types";
import {cardioTypes,cardioLabels,type CardioType} from "@/lib/physical/cardio";
import {Input} from "@/components/ui/input";
import {NumberInput} from "./NumberInput";
import {DurationFields} from "./DurationFields";
export function CardioFields({block,onChange,mode}:{block:TrainingBlock;onChange:(block:TrainingBlock)=>void;mode:"actual"|"template"}) {
 const type=block.details.cardioType??"stationary_bike";
 function value(key:string,next:number|null){
  const values={...block.values,[key]:next};
  onChange({...block,values,details:{...block.details,status:typeof values.duration==="number"&&values.duration>0?"done":"pending"}});
 }
 const resistance=["stationary_bike","elliptical","rowing"].includes(type);
 return <div className="space-y-4">
  <label className="block space-y-2 text-sm font-medium">Vrsta kardija<select className="h-12 w-full rounded-md border bg-background px-3" value={type} onChange={e=>{
   const values={...block.values};for(const key of ["resistance","incline","floors"])delete values[key];
   onChange({...block,values,details:{...block.details,cardioType:e.target.value as CardioType,cardioName:undefined,runSurface:undefined}});
  }}>{cardioTypes.map(t=><option key={t} value={t}>{cardioLabels[t]}</option>)}</select></label>
  {type==="other"&&<label className="block space-y-2 text-sm">Naziv aktivnosti<Input required maxLength={200} value={block.details.cardioName??""} placeholder="Na primer: Aerobik" onChange={e=>onChange({...block,details:{...block.details,cardioName:e.target.value}})}/></label>}
  {type==="walking"&&<label className="block space-y-2 text-sm">Mesto<select className="h-12 w-full rounded-md border bg-background px-3" value={block.details.runSurface??"outdoor"} onChange={e=>{const values={...block.values};delete values.incline;onChange({...block,values,details:{...block.details,runSurface:e.target.value as "outdoor"|"treadmill"}});}}><option value="outdoor">Napolju</option><option value="treadmill">Traka</option></select></label>}
  {mode==="actual"&&<>
   <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr] sm:items-end"><DurationFields value={block.values.duration as number|null} onChange={n=>value("duration",n)}/><NumberInput label="Distanca (opciono)" unit="km" min={0.001} value={block.values.distance as number|null} onChange={n=>value("distance",n)}/></div>
   <p className="text-xs text-muted-foreground">Za urađeni kardio unesi trajanje. Ostali podaci su opcioni.</p>
   <details><summary className="cursor-pointer text-sm font-medium text-muted-foreground">Dodatni podaci sa sprave</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
    {resistance&&<NumberInput label="Nivo otpora" value={block.values.resistance as number|null} onChange={n=>value("resistance",n)}/>}
    {type==="walking"&&block.details.runSurface==="treadmill"&&<NumberInput label="Nagib" unit="%" value={block.values.incline as number|null} onChange={n=>value("incline",n)}/>}
    {type==="stepper"&&<NumberInput label="Spratovi" integer value={block.values.floors as number|null} onChange={n=>value("floors",n)}/>}
    <NumberInput label="Prosečan puls" unit="bpm" integer min={1} value={block.values.averageHeartRate as number|null} onChange={n=>value("averageHeartRate",n)}/>
    <NumberInput label="Kalorije" unit="kcal" value={block.values.calories as number|null} onChange={n=>value("calories",n)}/>
   </div></details>
  </>}
 </div>;
}

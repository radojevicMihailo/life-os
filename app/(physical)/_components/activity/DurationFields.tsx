"use client";
import {useId,useState} from "react";
import {Input} from "@/components/ui/input";
import {parseDurationParts} from "@/lib/physical/input";
export function DurationFields({value,onChange,label="Trajanje"}:{value:number|null|undefined;onChange:(value:number|null)=>void;label?:string}){
 const id=useId(),[parts,setParts]=useState(value==null?["","",""]:[String(Math.floor(value/3600)),String(Math.floor(value%3600/60)),String(value%60)]),[error,setError]=useState("");
 return <fieldset className="min-w-0"><legend className="mb-2 text-sm font-medium">{label}</legend><div className="grid grid-cols-3 gap-2">{["Sati","Minuti","Sekunde"].map((name,i)=><label key={name} className="min-w-0 text-xs text-muted-foreground" htmlFor={`${id}-${i}`}>{name}<Input id={`${id}-${i}`} inputMode="numeric" value={parts[i]} placeholder="0" className="mt-1 h-12 text-lg tabular-nums" aria-invalid={!!error} onChange={e=>{const next=parts.map((v,index)=>index===i?e.target.value:v);setParts(next);const n=parseDurationParts(next[0],next[1],next[2]),empty=next.every(v=>!v.trim());const message=!empty&&n==null?"Unesi ispravno vreme; minuti i sekunde su od 0 do 59.":"";setError(message);const fields=e.currentTarget.closest("fieldset")?.querySelectorAll("input");fields?.forEach(input=>input.setCustomValidity(message));if(empty||n!=null)onChange(n);}}/></label>)}</div>{error&&<p className="mt-2 text-xs text-destructive">{error}</p>}</fieldset>;
}

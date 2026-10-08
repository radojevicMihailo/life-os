"use client";
import {useId,useState} from "react";
import {Input} from "@/components/ui/input";
import {parseNumber} from "@/lib/physical/input";
export function NumberInput({label,value,onChange,unit,integer=false,min=0,placeholder}:{label:string;value:number|null|undefined;onChange:(value:number|null)=>void;unit?:string;integer?:boolean;min?:number;placeholder?:string}){
 const id=useId(),[text,setText]=useState(value==null?"":String(value)),[error,setError]=useState(""),[lastValue,setLastValue]=useState(value);
 if(value!==lastValue){setLastValue(value);setText(value==null?"":String(value));setError("");}
 return <div className="min-w-0 space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}{unit&&<span className="ml-1 text-muted-foreground">({unit})</span>}</label><Input ref={el=>{el?.setCustomValidity(error);}} id={id} inputMode={integer?"numeric":"decimal"} value={text} placeholder={placeholder??"—"} className="h-12 text-lg tabular-nums" aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={e=>{const raw=e.target.value;setText(raw);const n=raw.trim()?parseNumber(raw,{min,integer}):null;const invalid=!!raw.trim()&&n==null;const message=invalid?min<0?`Unesi ispravan ${integer?"ceo ":""}broj.`:`Unesi ${integer?"ceo ":""}broj ${min>0?`najmanje ${min}`:"bez negativnog znaka"}.`:"";e.currentTarget.setCustomValidity(message);setError(message);if(!invalid){setLastValue(n);onChange(n);}}}/>{error&&<p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}</div>;
}

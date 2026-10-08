"use client";
import type {TrainingBlock} from "@/lib/physical/types";
import {computePace} from "@/lib/physical/pace";
import {secondsToMmSs} from "@/lib/physical/formatDuration";
import {NumberInput} from "./NumberInput";
import {DurationFields} from "./DurationFields";
export function RunFields({block,onChange}:{block:TrainingBlock;onChange:(values:Record<string,unknown>)=>void}){
 const distance=block.values.distance as number|null, duration=block.values.duration as number|null;
 const pace=distance&&duration?computePace(distance,duration):null;
 return <div className="space-y-4"><div className="grid gap-4 sm:items-end sm:grid-cols-[1fr_1.5fr]"><div className="min-w-0"><NumberInput label="Distanca" unit="km" min={0.001} value={distance} onChange={n=>onChange({...block.values,distance:n})}/></div><DurationFields value={duration} onChange={n=>onChange({...block.values,duration:n})}/></div><p className="text-sm text-muted-foreground">{pace!=null?<>Tempo <span className="font-semibold text-foreground">{secondsToMmSs(pace)} /km</span></>:"Unesi distancu ili trajanje. Sa oba podatka tempo se računa automatski."}</p></div>;
}

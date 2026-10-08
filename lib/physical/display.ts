import type {SetEntry,TrainingBlock} from "./types";
import {secondsToHhmmss,secondsToMmSs} from "./formatDuration";
import {computePace} from "./pace";
export const blockKindLabels={split:"Trčanje",exercise:"Vežba",sprint:"Sprintovi / intervali"};
export function describeBlock(block:TrainingBlock):string{
 const v=block.values;
 if(block.kind==="split"){
 const distance=typeof v.distance==="number"&&v.distance>0?v.distance:null,time=typeof v.duration==="number"&&v.duration>0?v.duration:null;
 const pace=distance&&time?computePace(distance,time):null;
 return [distance?`${new Intl.NumberFormat("sr-RS").format(distance)} km`:null,time?secondsToHhmmss(time):null,pace!=null?`${secondsToMmSs(pace)} /km`:typeof v.pace==="number"?`Zabeleženi tempo ${secondsToMmSs(v.pace)} /km`:null].filter(Boolean).join(" · ")||"Rezultat još nije unet";
 }
 if(block.kind==="sprint")return `${v.sprintReps??"—"} × ${[v.sprintDistance?`${v.sprintDistance} m`:null,v.sprintDuration?`${v.sprintDuration} s`:null].filter(Boolean).join(" / ")||"—"}${v.sprintRest!=null?` · pauza ${v.sprintRest} s`:""}`;
 const sets=Array.isArray(v.sets)?v.sets as SetEntry[]:[];
 return sets.map(s=>`${s.weight!=null?`${s.weight} kg × `:""}${s.durationSec?`${s.durationSec} s`:`${s.reps??"—"} pon.`}${s.perSide?" po strani":""}${s.warmup?" (zagrevanje)":""}${s.bodyweight?" (sopstvena težina)":""}`).join(" · ")||"Serije još nisu unete";
}

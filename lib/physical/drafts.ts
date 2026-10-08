import { emptyDetails } from "./blocks";
import type { ActivityDraft,BlockTargets,PlanBlocks,SetEntry } from "./types";
const actualKeys=new Set(["sets","distance","duration","pace","sprintDistance","sprintDuration","sprintReps","sprintRest"]);
export function repeatActivity(source:ActivityDraft,today:Date):ActivityDraft{
 return {title:source.title,performedAt:new Date(today),values:{},comment:null,stravaUrl:null,tagIds:[...source.tagIds],blocks:source.blocks.map((b,sortOrder)=>({...structuredClone(b),id:undefined,rowKey:crypto.randomUUID(),sortOrder,values:{},details:{...structuredClone(b.details),status:"pending"}}))};
}
export function draftFromPlan(plan:{name:string;notes:string|null;tagIds:string[];blocks:PlanBlocks},today:Date):ActivityDraft{
 return {title:plan.name,performedAt:new Date(today),values:{},comment:plan.notes,stravaUrl:null,tagIds:[...new Set([...(plan.blocks.tagIds??[]),...plan.tagIds])],blocks:plan.blocks.items.map((b,sortOrder)=>({...structuredClone(b),rowKey:crypto.randomUUID(),sortOrder,values:Object.fromEntries(Object.entries(b.values).filter(([k])=>!actualKeys.has(k))),details:{...emptyDetails(),...structuredClone(b.details),status:"pending"}}))};
}
export function planFromActivity(source:ActivityDraft,resultsAsTargets:boolean):PlanBlocks{
 return {version:1,tagIds:[...source.tagIds],items:source.blocks.map(b=>{
 const targets:BlockTargets=structuredClone(b.details.targets);
 if(resultsAsTargets&&b.details.status==="done"){
 const mapping={distance:"distanceKm",duration:"durationSec",sprintDistance:"sprintDistanceM",sprintDuration:"sprintDurationSec",sprintReps:"repetitions",sprintRest:"restSec"} as const;
 for(const [key,target] of Object.entries(mapping)){const n=b.values[key];if(typeof n==="number"&&n>0)targets[target]={min:n,max:n};}
 const sets=b.values.sets;if(Array.isArray(sets)&&sets.length){
 targets.setCount={min:sets.length,max:sets.length};delete targets.reps;delete targets.durationSec;
 for(const key of ["reps","durationSec"] as const){const numbers=(sets as SetEntry[]).flatMap(s=>typeof s[key]==="number"&&s[key]!>0?[s[key]!]:[]);if(numbers.length)targets[key]={min:Math.min(...numbers),max:Math.max(...numbers)};}
 }
 }
 const {status,...details}=structuredClone(b.details);void status;
 return {kind:b.kind,exerciseId:b.exerciseId,sortOrder:b.sortOrder,tagIds:[...b.tagIds],values:Object.fromEntries(Object.entries(b.values).filter(([k])=>!actualKeys.has(k))),details:{...details,targets}};
 })};
}

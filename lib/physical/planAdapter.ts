import {emptyDetails} from "./blocks";
import type {ActivityDraft,PlanBlocks} from "./types";
export type LegacyPlanExercise={exerciseId:string;setCount:number;sortOrder:number;linkNext:boolean};
export function adaptLegacyPlan(rows:LegacyPlanExercise[]):PlanBlocks{
 const sorted=[...rows].sort((a,b)=>a.sortOrder-b.sortOrder);
 return {version:1,items:sorted.map((e,sortOrder)=>{const {status,...details}=emptyDetails();void status;return {kind:"exercise",exerciseId:e.exerciseId,sortOrder,tagIds:[],values:{},details:{...details,linkNext:e.linkNext&&sortOrder<sorted.length-1,targets:{setCount:{min:e.setCount,max:e.setCount}}}};})};
}
export function resolvePlanBlocks(blocks:PlanBlocks|null,legacy:LegacyPlanExercise[]):PlanBlocks{return blocks??adaptLegacyPlan(legacy);}
export function combinePlanDrafts(drafts:ActivityDraft[],title:string,tagIds:string[],today:Date):ActivityDraft{
 const blocks=drafts.flatMap(d=>d.blocks.map((b,i)=>({...structuredClone(b),id:undefined,rowKey:crypto.randomUUID(),details:{...b.details,linkNext:i===d.blocks.length-1?false:b.details.linkNext}}))).map((b,sortOrder)=>({...b,sortOrder}));
 return {title,performedAt:new Date(today),values:{},comment:drafts.map(d=>d.comment).filter(Boolean).join("\n\n")||null,stravaUrl:null,tagIds:[...new Set([...tagIds,...drafts.flatMap(d=>d.tagIds)])],blocks};
}
export function sanitizePlanTags(blocks:PlanBlocks,tags:{id:string}[]):PlanBlocks{
 const known=new Set(tags.map(t=>t.id));return {...blocks,tagIds:blocks.tagIds?.filter(id=>known.has(id)),items:blocks.items.map(b=>({...b,tagIds:b.tagIds.filter(id=>known.has(id))}))};
}

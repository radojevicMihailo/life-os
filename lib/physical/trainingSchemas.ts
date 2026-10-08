import { z } from "zod";
const range=z.object({min:z.number().finite().nonnegative(),max:z.number().finite().nonnegative()}).refine(r=>r.max>=r.min,"Maksimum ne može biti manji od minimuma.");
export const targetsSchema=z.object({distanceKm:range.optional(),durationSec:range.optional(),repetitions:range.optional(),sprintDistanceM:range.optional(),sprintDurationSec:range.optional(),restSec:range.optional(),setCount:range.optional(),reps:range.optional()});
export const intervalSegmentSchema=z.object({timeMode:z.enum(["duration","pace"]).optional(),label:z.string().max(200),distance:z.number().finite().positive().nullable(),duration:z.number().int().positive().nullable(),pace:z.number().int().positive().nullable()}).refine(s=>s.duration==null||s.pace==null,"Unesi tempo ili trajanje deonice.");
export const blockDetailsSchema=z.object({version:z.literal(1),legacyActuals:z.boolean().optional(),intervalTargets:z.array(intervalSegmentSchema).max(200).optional(),label:z.string().max(200).nullable(),note:z.string().max(10000).nullable(),status:z.enum(["pending","done","skipped"]),targets:targetsSchema,linkNext:z.boolean(),restSec:z.number().int().nonnegative().nullable(),optional:z.boolean()});
export const placementSchema=z.object({scope:z.enum(["session","block"]),modes:z.array(z.enum(["running","gym","mixed"])),kinds:z.array(z.enum(["exercise","split","sprint","interval"])),when:z.object({groupId:z.uuid(),tagIds:z.array(z.uuid()).min(1)}).optional()});
const setSchema=z.object({weight:z.number().finite().nonnegative().optional(),reps:z.number().int().nonnegative().optional(),durationSec:z.number().int().positive().optional(),bodyweight:z.boolean().optional(),warmup:z.boolean().optional(),perSide:z.boolean().optional()}).refine(s=>(s.reps!=null)!==(s.durationSec!=null),"Unesi ponavljanja ili trajanje serije.");
const valuesSchema=z.object({segments:z.array(intervalSegmentSchema).max(200).optional(),sets:z.array(setSchema).optional().nullable(),distance:z.number().finite().positive().optional().nullable(),duration:z.number().int().positive().optional().nullable(),pace:z.number().int().nonnegative().optional().nullable(),sprintDistance:z.number().finite().positive().optional().nullable(),sprintDuration:z.number().int().positive().optional().nullable(),sprintReps:z.number().int().positive().optional().nullable(),sprintRest:z.number().int().nonnegative().optional().nullable()}).loose();
const baseBlock=z.object({id:z.uuid().optional(),kind:z.enum(["exercise","split","sprint","interval"]),exerciseId:z.uuid().nullable(),sortOrder:z.number().int().nonnegative(),values:valuesSchema,tagIds:z.array(z.uuid()).default([]),details:blockDetailsSchema});
export const trainingBlockSchema=baseBlock.superRefine((b,ctx)=>{
 if(b.details.status!=="done")return;
 const issue=(path:string[],message:string)=>ctx.addIssue({code:"custom",path,message});
 if(b.kind==="split"&&!b.values.distance&&!b.values.duration)issue(["values","distance"],"Unesi distancu ili trajanje trčanja.");
 if(b.kind==="sprint"&&(!b.values.sprintReps||(!b.values.sprintDistance&&!b.values.sprintDuration)))issue(["values","sprintReps"],"Unesi broj sprintova i distancu ili trajanje.");
 if(b.kind==="interval"){
 if(!b.values.segments?.length)issue(["values","segments"],"Dodaj najmanje jednu deonicu.");
 b.values.segments?.forEach((s,i)=>{if(!s.distance||(!s.duration&&!s.pace))issue(["values","segments",String(i)],"Unesi distancu i tempo ili trajanje svake deonice.");});
 }
 if(b.kind==="exercise"){
 if(!b.exerciseId)issue(["exerciseId"],"Izaberi vežbu.");
 if(!b.values.sets?.length||!b.values.sets.every(s=>(s.reps??0)>0||(s.durationSec??0)>0))issue(["values","sets"],"Unesi rezultat svake serije.");
 }
});
const planBlock=baseBlock.omit({id:true,details:true,values:true}).extend({details:blockDetailsSchema.omit({status:true}),values:z.record(z.string(),z.unknown())}).superRefine((b,ctx)=>{
 for(const key of ["segments","sets","distance","duration","pace","sprintDistance","sprintDuration","sprintReps","sprintRest"])if(b.values[key]!=null)ctx.addIssue({code:"custom",path:["values",key],message:"Šablon čuva ciljeve, ne rezultate."});
});
export const planBlocksSchema=z.object({version:z.literal(1),tagIds:z.array(z.uuid()).optional(),items:z.array(planBlock)});

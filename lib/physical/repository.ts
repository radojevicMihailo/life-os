import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isDeepStrictEqual } from "node:util";
import * as schema from "@/db/schema/physical";
import { activityPayloadSchema, workoutPlanPayloadSchema } from "@/lib/validation/physical";
import { trainingBlockSchema } from "./trainingSchemas";
import { tagConflicts } from "./tagSelection";
import { adaptStoredBlock,inferEntryMode } from "./blocks";
import { summarizeActivity } from "./activitySummary";
import type { BlockDetails } from "./types";
const {activity,activitySubrow,activitySubrowTag,activityTag,exercise,physicalActivityTag,physicalField,workoutPlan,workoutPlanExercise}=schema;
export type PhysicalDb=NodePgDatabase<typeof schema>;
export class TrainingInputError extends Error {
 constructor(message:string,public fieldErrors:Record<string,string>={}){super(message);}
}
function parseError(error:{issues:{path:PropertyKey[];message:string}[]}):TrainingInputError{
 return new TrainingInputError(error.issues[0]?.message??"Proveri unesene podatke.",Object.fromEntries(error.issues.map(i=>[i.path.join("."),i.message])));
}
export async function saveActivity(database:PhysicalDb,raw:unknown,id?:string):Promise<string>{
 return database.transaction(async tx=>{
  const fields=await tx.select().from(physicalField);
  const parsed=activityPayloadSchema(fields.filter(f=>f.scope==="top"),fields.filter(f=>f.scope==="subrow")).safeParse(raw);
  if(!parsed.success)throw parseError(parsed.error);
  const payload=parsed.data;
  if(id){const existing=await tx.select().from(activity).where(eq(activity.id,id)).for("update");if(!existing.length)throw new TrainingInputError("Aktivnost više ne postoji.");}
  const originals=id?await tx.select().from(activitySubrow).where(eq(activitySubrow.activityId,id)):[];
  const allTags=await tx.select().from(activityTag),tagsById=new Map(allTags.map(t=>[t.id,t]));
  const checkTags=(ids:string[])=>{if(ids.some(tag=>!tagsById.has(tag)))throw new TrainingInputError("Jedna od opcija više ne postoji. Osveži izbor.");if(tagConflicts(ids,allTags).length)throw new TrainingInputError("Izaberi jednu opciju po grupi.");};
  checkTags(payload.tagIds);
  const prepared=payload.subrows.map((b,sortOrder)=>{
   const original=b.id?originals.find(o=>o.id===b.id):undefined;
   if(b.id&&!original)throw new TrainingInputError("Deo treninga ne pripada ovoj aktivnosti.");
   let details:BlockDetails|null=b.details??null;
   if(details){
    const unchangedLegacy=original&&(!original.details||original.details.legacyActuals)&&original.kind===b.kind&&original.exerciseId===b.exerciseId&&isDeepStrictEqual(original.values,b.values);
    const checked=trainingBlockSchema.safeParse(b);
    if(!checked.success&&!unchangedLegacy)throw parseError({issues:checked.error.issues.map(i=>({...i,path:["subrows",sortOrder,...i.path]}))});
    details={...details,legacyActuals:!checked.success&&!!unchangedLegacy};
    if(details.linkNext&&(b.kind!=="exercise"||payload.subrows[sortOrder+1]?.kind!=="exercise"))details.linkNext=false;
   }
   checkTags(b.tagIds);
   return {...b,details,sortOrder};
  });
  const exerciseIds=[...new Set(prepared.flatMap(b=>b.exerciseId?[b.exerciseId]:[]))];
  const catalog=exerciseIds.length?await tx.select().from(exercise).where(inArray(exercise.id,exerciseIds)):[];
  for(const b of prepared)if(b.exerciseId){
   const ex=catalog.find(e=>e.id===b.exerciseId);if(!ex)throw new TrainingInputError("Vežba više ne postoji.");
   if(ex.archivedAt&&!originals.some(o=>o.exerciseId===ex.id))throw new TrainingInputError("Arhivirana vežba može da ostane samo u postojećem treningu.");
  }
  const parent={title:payload.title??null,performedAt:payload.performedAt,values:payload.values,comment:payload.comment??null,stravaUrl:payload.stravaUrl??null};
  let activityId=id;
  if(activityId)await tx.update(activity).set({...parent,updatedAt:sql`now()`}).where(eq(activity.id,activityId));
  else [activityId]=(await tx.insert(activity).values(parent).returning({id:activity.id})).map(a=>a.id);
  await tx.delete(physicalActivityTag).where(eq(physicalActivityTag.activityId,activityId!));
  if(payload.tagIds.length)await tx.insert(physicalActivityTag).values([...new Set(payload.tagIds)].map(tagId=>({activityId:activityId!,tagId})));
  await tx.delete(activitySubrow).where(eq(activitySubrow.activityId,activityId!));
  if(prepared.length){
   const rows=await tx.insert(activitySubrow).values(prepared.map(b=>({activityId:activityId!,kind:b.kind,exerciseId:b.kind==="exercise"?b.exerciseId:null,values:b.values,details:b.details,sortOrder:b.sortOrder}))).returning({id:activitySubrow.id,sortOrder:activitySubrow.sortOrder});
   const links=rows.flatMap(row=>[...new Set(prepared[row.sortOrder].tagIds)].map(tagId=>({subrowId:row.id,tagId})));
   if(links.length)await tx.insert(activitySubrowTag).values(links);
  }
  return activityId!;
 });
}
export async function saveWorkoutPlan(database:PhysicalDb,raw:unknown,id?:string):Promise<string>{
 const parsed=workoutPlanPayloadSchema.safeParse(raw);if(!parsed.success)throw parseError(parsed.error);const data=parsed.data;
 return database.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(8192001)`);
  const [existing]=id?await tx.select().from(workoutPlan).where(eq(workoutPlan.id,id)).for("update"):[];
  if(id&&!existing)throw new TrainingInputError("Šablon více ne postoji.");
  const exerciseIds=[...new Set(data.blocks?data.blocks.items.flatMap(b=>b.exerciseId?[b.exerciseId]:[]):data.exercises.map(e=>e.exerciseId))];
  const catalog=exerciseIds.length?await tx.select().from(exercise).where(inArray(exercise.id,exerciseIds)):[];
  if(catalog.length!==exerciseIds.length)throw new TrainingInputError("Jedna od vežbi više ne postoji.");
  const oldExerciseRows=id?await tx.select().from(workoutPlanExercise).where(eq(workoutPlanExercise.planId,id)):[];
  for(const ex of catalog)if(ex.archivedAt&&!existing?.blocks?.items.some(b=>b.exerciseId===ex.id)&&!oldExerciseRows.some(e=>e.exerciseId===ex.id))throw new TrainingInputError("Izaberi aktivnu vežbu za novi šablon.");
  const tags=await tx.select().from(activityTag);for(const b of [{tagIds:data.blocks?.tagIds??[]},...(data.blocks?.items??[])])if(b.tagIds.some(t=>!tags.some(tag=>tag.id===t))||tagConflicts(b.tagIds,tags).length)throw new TrainingInputError("Proveri opcije delova šablona.");
  let planId=id;
  const patch={name:data.name,notes:data.notes??null,...(data.blocks?{blocks:data.blocks}:{})};
  if(planId)await tx.update(workoutPlan).set({...patch,updatedAt:sql`now()`}).where(eq(workoutPlan.id,planId));
  else [planId]=(await tx.insert(workoutPlan).values(patch).returning({id:workoutPlan.id})).map(p=>p.id);
  if(!data.blocks){await tx.delete(workoutPlanExercise).where(eq(workoutPlanExercise.planId,planId!));if(data.exercises.length)await tx.insert(workoutPlanExercise).values(data.exercises.map(e=>({...e,planId:planId!})));}
  return planId!;
 });
}
export async function removeExercise(database:PhysicalDb,id:string):Promise<void>{
 await database.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(8192001)`);
  const plans=await tx.select({blocks:workoutPlan.blocks}).from(workoutPlan);
  if(plans.some(p=>p.blocks?.items.some(b=>b.exerciseId===id)))throw new TrainingInputError("Vežba je deo šablona. Možeš da je arhiviraš.");
  await tx.delete(exercise).where(eq(exercise.id,id));
 });
}
export async function loadActivity(database:PhysicalDb,id:string){
 const [a]=await database.select().from(activity).where(eq(activity.id,id)).limit(1);if(!a)return null;
 const [subrows,tags]=await Promise.all([database.select().from(activitySubrow).where(eq(activitySubrow.activityId,id)).orderBy(asc(activitySubrow.sortOrder)),database.select().from(physicalActivityTag).where(eq(physicalActivityTag.activityId,id))]);
 const blockTags=subrows.length?await database.select().from(activitySubrowTag).where(inArray(activitySubrowTag.subrowId,subrows.map(b=>b.id))):[];
 return {activity:a,subrows:subrows.map(b=>({...b,tagIds:blockTags.filter(t=>t.subrowId===b.id).map(t=>t.tagId)})),tagIds:tags.map(t=>t.tagId)};
}
export async function loadActivities(database:PhysicalDb,filters:{tagId?:string;from?:Date;to?:Date;limit?:number}={}){
 const conditions=[];if(filters.from)conditions.push(gte(activity.performedAt,filters.from));if(filters.to)conditions.push(lte(activity.performedAt,filters.to));
 if(filters.tagId){
 const [session,blocks]=await Promise.all([database.select({id:physicalActivityTag.activityId}).from(physicalActivityTag).where(eq(physicalActivityTag.tagId,filters.tagId)),database.select({id:activitySubrow.activityId}).from(activitySubrowTag).innerJoin(activitySubrow,eq(activitySubrowTag.subrowId,activitySubrow.id)).where(eq(activitySubrowTag.tagId,filters.tagId))]);
 const ids=[...new Set([...session,...blocks].map(t=>t.id))];if(!ids.length)return [];conditions.push(inArray(activity.id,ids));
 }
 const query=database.select().from(activity).where(conditions.length?and(...conditions):undefined).orderBy(desc(activity.performedAt));
 const rows=filters.limit?await query.limit(filters.limit):await query;if(!rows.length)return [];
 const ids=rows.map(r=>r.id);
 const [subrows,tags]=await Promise.all([database.select().from(activitySubrow).where(inArray(activitySubrow.activityId,ids)).orderBy(asc(activitySubrow.sortOrder)),database.select().from(physicalActivityTag).where(inArray(physicalActivityTag.activityId,ids))]);
 const blockTags=subrows.length?await database.select().from(activitySubrowTag).where(inArray(activitySubrowTag.subrowId,subrows.map(b=>b.id))):[];
 return rows.map(a=>{const blocks=subrows.filter(b=>b.activityId===a.id).map(b=>({...b,tagIds:blockTags.filter(t=>t.subrowId===b.id).map(t=>t.tagId)}));return {...a,tagIds:[...new Set([...tags.filter(t=>t.activityId===a.id).map(t=>t.tagId),...blocks.flatMap(b=>b.tagIds)])],subrowCount:blocks.length,mode:inferEntryMode(blocks.map(adaptStoredBlock),"mixed"),summary:summarizeActivity(blocks.map(adaptStoredBlock))};});
}

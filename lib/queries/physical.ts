import "server-only";
import { asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { loadActivity, loadActivities } from "@/lib/physical/repository";
import type { Summary,ActivityDraft,EntryMode } from "@/lib/physical/types";
import { adaptStoredBlock } from "@/lib/physical/blocks";
import { includeRequestedActivity } from "@/lib/physical/sourceSelection";
import { repeatActivity,draftFromPlan } from "@/lib/physical/drafts";
import { resolvePlanBlocks,combinePlanDrafts,sanitizePlanTags } from "@/lib/physical/planAdapter";
import { tagConflicts } from "@/lib/physical/tagSelection";
import {
  activity, activitySubrow, activitySubrowTag, physicalActivityTag,
  activityTag,
  activityTagGroup,
  exercise,
  exerciseGroup,
  physicalField,
  split,
  splitDay,
  splitDayTag,
  splitDayWorkoutPlan,
  workoutPlan,
  workoutPlanExercise,
  type Activity,
  type ActivitySubrow,
  type ActivityTag,
  type ActivityTagGroup,
  type Exercise,
  type ExerciseGroup,
  type PhysicalField,
  type Split,
  type SplitDay,
  type WorkoutPlan,
  type WorkoutPlanExercise,
} from "@/db/schema/physical";

export async function getTagGroups(): Promise<ActivityTagGroup[]> {
  return db
    .select()
    .from(activityTagGroup)
    .orderBy(asc(activityTagGroup.sortOrder), asc(activityTagGroup.name));
}

export async function getTags(): Promise<ActivityTag[]> {
  return db
    .select()
    .from(activityTag)
    .orderBy(asc(activityTag.sortOrder), asc(activityTag.name));
}

export type TagGroupWithTags = { group: ActivityTagGroup; tags: ActivityTag[] };

export async function getTagGroupsWithTags(): Promise<TagGroupWithTags[]> {
  const [groups, tags] = await Promise.all([getTagGroups(), getTags()]);
  const byGroup = new Map<string, ActivityTag[]>();
  for (const t of tags) {
    const list = byGroup.get(t.groupId) ?? [];
    list.push(t);
    byGroup.set(t.groupId, list);
  }
  return groups.map((g) => ({ group: g, tags: byGroup.get(g.id) ?? [] }));
}

export async function getExerciseGroups(): Promise<ExerciseGroup[]> {
  return db
    .select()
    .from(exerciseGroup)
    .orderBy(asc(exerciseGroup.sortOrder), asc(exerciseGroup.name));
}

export async function getExercises(includeIds: string[] = []): Promise<Exercise[]> {
  return db
    .select()
    .from(exercise)
    .where(includeIds.length ? or(isNull(exercise.archivedAt), inArray(exercise.id, includeIds)) : isNull(exercise.archivedAt))
    .orderBy(asc(exercise.name));
}

export type AllFields = {
  topFields: PhysicalField[];
  subrowFields: PhysicalField[];
};

export async function getAllFields(): Promise<AllFields> {
  const rows = await db
    .select()
    .from(physicalField)
    .orderBy(asc(physicalField.sortOrder), asc(physicalField.label));
  return {
    topFields: rows.filter((f) => f.scope === "top"),
    subrowFields: rows.filter((f) => f.scope === "subrow"),
  };
}

export type ActivityListFilters = {
  tagId?: string;
  from?: Date;
  to?: Date;
};

export type ActivityListRow = Activity & { tagIds: string[]; subrowCount: number; mode: EntryMode; summary: Summary };

export async function getActivities(filters: ActivityListFilters): Promise<ActivityListRow[]> {
  return loadActivities(db, filters);
}

export type ActivityDetail = {
  activity: Activity;
  subrows: (ActivitySubrow & { tagIds: string[] })[];
  tagIds: string[];
};

export async function getActivity(id: string): Promise<ActivityDetail | null> {
  return loadActivity(db,id);
}

export type WorkoutPlanListRow = WorkoutPlan & { exerciseCount: number };

export async function getWorkoutPlans(): Promise<WorkoutPlanListRow[]> {
  const rows = await db
    .select()
    .from(workoutPlan)
    .where(isNull(workoutPlan.archivedAt))
    .orderBy(asc(workoutPlan.name));
  if (rows.length === 0) return [];
  const exs = await db
    .select()
    .from(workoutPlanExercise)
    .where(inArray(workoutPlanExercise.planId, rows.map((p) => p.id)));
  const count = new Map<string, number>();
  for (const e of exs) count.set(e.planId, (count.get(e.planId) ?? 0) + 1);
  return rows.map((p) => ({ ...p, exerciseCount: count.get(p.id) ?? 0 }));
}

export type WorkoutPlanDetail = {
  plan: WorkoutPlan;
  exercises: WorkoutPlanExercise[];
};

export async function getWorkoutPlan(id: string): Promise<WorkoutPlanDetail | null> {
  const [p] = await db.select().from(workoutPlan).where(eq(workoutPlan.id, id)).limit(1);
  if (!p) return null;
  const exercises = await db
    .select()
    .from(workoutPlanExercise)
    .where(eq(workoutPlanExercise.planId, id))
    .orderBy(asc(workoutPlanExercise.sortOrder));
  const tags = await getTags();
  return { plan: {...p, blocks: p.blocks ? sanitizePlanTags(p.blocks,tags) : null}, exercises };
}

export type SplitListRow = Split & { dayCount: number };

export async function getSplits(): Promise<SplitListRow[]> {
  const rows = await db
    .select()
    .from(split)
    .where(isNull(split.archivedAt))
    .orderBy(asc(split.name));
  if (rows.length === 0) return [];
  const days = await db
    .select()
    .from(splitDay)
    .where(inArray(splitDay.splitId, rows.map((s) => s.id)));
  const count = new Map<string, number>();
  for (const d of days) count.set(d.splitId, (count.get(d.splitId) ?? 0) + 1);
  return rows.map((s) => ({ ...s, dayCount: count.get(s.id) ?? 0 }));
}

export type SplitDayWithTags = SplitDay & { tagIds: string[]; workoutPlanIds: string[] };

export type SplitDetail = {
  split: Split;
  days: SplitDayWithTags[];
};

export async function getSplit(id: string): Promise<SplitDetail | null> {
  const [s] = await db.select().from(split).where(eq(split.id, id)).limit(1);
  if (!s) return null;
  const days = await db
    .select()
    .from(splitDay)
    .where(eq(splitDay.splitId, id))
    .orderBy(asc(splitDay.sortOrder));
  if (days.length === 0) return { split: s, days: [] };
  const dayIds = days.map((d) => d.id);
  const [tagLinks, planLinks] = await Promise.all([
    db.select().from(splitDayTag).where(inArray(splitDayTag.dayId, dayIds)),
    db.select().from(splitDayWorkoutPlan).where(inArray(splitDayWorkoutPlan.dayId, dayIds)),
  ]);
  const tagMap = new Map<string, string[]>();
  for (const t of tagLinks) {
    const list = tagMap.get(t.dayId) ?? [];
    list.push(t.tagId);
    tagMap.set(t.dayId, list);
  }
  const planMap = new Map<string, string[]>();
  for (const p of planLinks) {
    const list = planMap.get(p.dayId) ?? [];
    list.push(p.planId);
    planMap.set(p.dayId, list);
  }
  return {
    split: s,
    days: days.map((d) => ({
      ...d,
      tagIds: tagMap.get(d.id) ?? [],
      workoutPlanIds: planMap.get(d.id) ?? [],
    })),
  };
}

/** Batched source loading; no mutation happens when a source is previewed. */
export async function getRecordingSources(requestedSource?:string): Promise<import("@/lib/physical/types").SourceOption[]> {
 const [recentActivities,plans,days,allTags]=await Promise.all([
  db.select().from(activity).orderBy(desc(activity.performedAt)).limit(20),
  db.select().from(workoutPlan).where(isNull(workoutPlan.archivedAt)).orderBy(asc(workoutPlan.name)),
  db.select({day:splitDay,splitName:split.name}).from(splitDay).innerJoin(split,eq(splitDay.splitId,split.id)).where(isNull(split.archivedAt)).orderBy(asc(split.name),asc(splitDay.sortOrder)),
  getTags(),
 ]);
 const activities=await includeRequestedActivity(recentActivities,requestedSource,async id=>(await db.select().from(activity).where(eq(activity.id,id)).limit(1))[0]??null);
 const ids=activities.map(a=>a.id),planIds=plans.map(p=>p.id),dayIds=days.map(d=>d.day.id);
 const [rows,sessionTags,legacyExercises,dayTags,dayPlans]=await Promise.all([
  ids.length?db.select().from(activitySubrow).where(inArray(activitySubrow.activityId,ids)).orderBy(asc(activitySubrow.sortOrder)):Promise.resolve([]),
  ids.length?db.select().from(physicalActivityTag).where(inArray(physicalActivityTag.activityId,ids)):Promise.resolve([]),
  planIds.length?db.select().from(workoutPlanExercise).where(inArray(workoutPlanExercise.planId,planIds)).orderBy(asc(workoutPlanExercise.sortOrder)):Promise.resolve([]),
  dayIds.length?db.select().from(splitDayTag).where(inArray(splitDayTag.dayId,dayIds)):Promise.resolve([]),
  dayIds.length?db.select().from(splitDayWorkoutPlan).where(inArray(splitDayWorkoutPlan.dayId,dayIds)):Promise.resolve([]),
 ]);
 const links=rows.length?await db.select().from(activitySubrowTag).where(inArray(activitySubrowTag.subrowId,rows.map(r=>r.id))):[];
 const today=new Date();
 const activitySources=activities.map(a=>{
  const previous:ActivityDraft={id:a.id,title:a.title,performedAt:a.performedAt,values:a.values,comment:a.comment,stravaUrl:a.stravaUrl,tagIds:sessionTags.filter(t=>t.activityId===a.id).map(t=>t.tagId),blocks:rows.filter(r=>r.activityId===a.id).map(r=>adaptStoredBlock({...r,tagIds:links.filter(t=>t.subrowId===r.id).map(t=>t.tagId)}))};
  return {id:a.id,kind:"activity" as const,label:a.title??`Trening · ${a.performedAt.toLocaleDateString("sr-RS")}`,draft:repeatActivity(previous,today),previous,conflicts:[]};
 });
 const planSources=plans.map(p=>{
  const blocks=sanitizePlanTags(resolvePlanBlocks(p.blocks,legacyExercises.filter(e=>e.planId===p.id)),allTags);
  const draft=draftFromPlan({name:p.name,notes:p.notes,tagIds:[],blocks},today);
  return {id:p.id,kind:"plan" as const,label:p.name,draft,conflicts:tagConflicts(draft.tagIds,allTags)};
 });
 const splitSources=days.flatMap(({day,splitName})=>{
  const drafts=dayPlans.filter(link=>link.dayId===day.id).flatMap(link=>{const source=planSources.find(p=>p.id===link.planId);return source?[source.draft]:[];});
  if(!drafts.length)return [];
  const label=`${splitName} · Dan ${day.sortOrder+1}`;
  const draft=combinePlanDrafts(drafts,label,dayTags.filter(t=>t.dayId===day.id).map(t=>t.tagId),today);
  return [{id:day.id,kind:"splitDay" as const,label,draft,conflicts:tagConflicts(draft.tagIds,allTags)}];
 });
 return [...planSources,...splitSources,...activitySources];
}

export async function getRecordingCatalog(includeIds:string[]=[]){
 const [tagGroups,tags,fields,exerciseGroups,exercises]=await Promise.all([getTagGroups(),getTags(),getAllFields(),getExerciseGroups(),getExercises(includeIds)]);
 return {tagGroups,tags,...fields,exerciseGroups,exercises};
}

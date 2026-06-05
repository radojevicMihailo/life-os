import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  activity,
  activitySubrow,
  activityTag,
  activityTagGroup,
  exercise,
  exerciseGroup,
  physicalActivityTag,
  physicalField,
  split,
  splitDay,
  splitDayTag,
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

export async function getExercises(): Promise<Exercise[]> {
  return db
    .select()
    .from(exercise)
    .where(isNull(exercise.archivedAt))
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

export type ActivityListRow = Activity & { tagIds: string[]; subrowCount: number };

export async function getActivities(filters: ActivityListFilters): Promise<ActivityListRow[]> {
  const conditions = [];
  if (filters.from) conditions.push(gte(activity.performedAt, filters.from));
  if (filters.to) conditions.push(lte(activity.performedAt, filters.to));

  let activityIds: string[] | null = null;
  if (filters.tagId) {
    const tagged = await db
      .select({ id: physicalActivityTag.activityId })
      .from(physicalActivityTag)
      .where(eq(physicalActivityTag.tagId, filters.tagId));
    activityIds = tagged.map((r) => r.id);
    if (activityIds.length === 0) return [];
    conditions.push(inArray(activity.id, activityIds));
  }

  const rows = await db
    .select()
    .from(activity)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activity.performedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [subrows, tagLinks] = await Promise.all([
    db.select().from(activitySubrow).where(inArray(activitySubrow.activityId, ids)),
    db.select().from(physicalActivityTag).where(inArray(physicalActivityTag.activityId, ids)),
  ]);

  const subCount = new Map<string, number>();
  for (const s of subrows) subCount.set(s.activityId, (subCount.get(s.activityId) ?? 0) + 1);

  const tagMap = new Map<string, string[]>();
  for (const t of tagLinks) {
    const list = tagMap.get(t.activityId) ?? [];
    list.push(t.tagId);
    tagMap.set(t.activityId, list);
  }

  return rows.map((a) => ({
    ...a,
    tagIds: tagMap.get(a.id) ?? [],
    subrowCount: subCount.get(a.id) ?? 0,
  }));
}

export type ActivityDetail = {
  activity: Activity;
  subrows: ActivitySubrow[];
  tagIds: string[];
};

export async function getActivity(id: string): Promise<ActivityDetail | null> {
  const [a] = await db.select().from(activity).where(eq(activity.id, id)).limit(1);
  if (!a) return null;
  const [subrows, tagLinks] = await Promise.all([
    db
      .select()
      .from(activitySubrow)
      .where(eq(activitySubrow.activityId, id))
      .orderBy(asc(activitySubrow.sortOrder)),
    db.select().from(physicalActivityTag).where(eq(physicalActivityTag.activityId, id)),
  ]);
  return { activity: a, subrows, tagIds: tagLinks.map((t) => t.tagId) };
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
  return { plan: p, exercises };
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

export type SplitDayWithTags = SplitDay & { tagIds: string[] };

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
  const tagLinks = await db
    .select()
    .from(splitDayTag)
    .where(inArray(splitDayTag.dayId, days.map((d) => d.id)));
  const tagMap = new Map<string, string[]>();
  for (const t of tagLinks) {
    const list = tagMap.get(t.dayId) ?? [];
    list.push(t.tagId);
    tagMap.set(t.dayId, list);
  }
  return {
    split: s,
    days: days.map((d) => ({ ...d, tagIds: tagMap.get(d.id) ?? [] })),
  };
}

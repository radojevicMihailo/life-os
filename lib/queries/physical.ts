import "server-only";
import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  activity,
  activitySubrow,
  category,
  exercise,
  modality,
  physicalField,
  plan,
  planSubrow,
  type Activity,
  type ActivitySubrow,
  type Category,
  type Exercise,
  type Modality,
  type PhysicalField,
  type Plan,
  type PlanSubrow,
} from "@/db/schema/physical";

export type ModalityWithFields = {
  modality: Modality;
  fields: PhysicalField[];
  categories: Category[];
  exercises: Exercise[];
};

export async function getModalities(includeArchived = false): Promise<Modality[]> {
  return db
    .select()
    .from(modality)
    .where(includeArchived ? undefined : isNull(modality.archivedAt))
    .orderBy(asc(modality.sortOrder), asc(modality.name));
}

export async function getModalityWithFields(id: string): Promise<ModalityWithFields | null> {
  const [m] = await db.select().from(modality).where(eq(modality.id, id)).limit(1);
  if (!m) return null;
  const [fields, categories, exercises] = await Promise.all([
    db
      .select()
      .from(physicalField)
      .where(eq(physicalField.modalityId, id))
      .orderBy(asc(physicalField.scope), asc(physicalField.sortOrder)),
    db
      .select()
      .from(category)
      .where(eq(category.modalityId, id))
      .orderBy(asc(category.sortOrder), asc(category.name)),
    db
      .select()
      .from(exercise)
      .where(and(eq(exercise.modalityId, id), isNull(exercise.archivedAt)))
      .orderBy(asc(exercise.name)),
  ]);
  return { modality: m, fields, categories, exercises };
}

export type ActivityListFilters = {
  modalityId?: string;
  from?: Date;
  to?: Date;
};

export type ActivityListRow = Activity & { modalityName: string; subrowCount: number };

export async function getActivities(filters: ActivityListFilters): Promise<ActivityListRow[]> {
  const conditions = [];
  if (filters.modalityId) conditions.push(eq(activity.modalityId, filters.modalityId));
  if (filters.from) conditions.push(gte(activity.performedAt, filters.from));
  if (filters.to) conditions.push(lte(activity.performedAt, filters.to));

  const rows = await db
    .select({
      a: activity,
      modalityName: modality.name,
    })
    .from(activity)
    .innerJoin(modality, eq(modality.id, activity.modalityId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activity.performedAt));

  if (rows.length === 0) return [];

  const subrows = await db.select().from(activitySubrow);
  const counter = new Map<string, number>();
  for (const s of subrows) counter.set(s.activityId, (counter.get(s.activityId) ?? 0) + 1);

  return rows.map(({ a, modalityName }) => ({
    ...a,
    modalityName,
    subrowCount: counter.get(a.id) ?? 0,
  }));
}

export type ActivityDetail = {
  activity: Activity;
  modality: Modality;
  fields: PhysicalField[];
  subrows: ActivitySubrow[];
  exercises: Exercise[];
  categories: Category[];
};

export async function getActivity(id: string): Promise<ActivityDetail | null> {
  const [a] = await db.select().from(activity).where(eq(activity.id, id)).limit(1);
  if (!a) return null;
  const withFields = await getModalityWithFields(a.modalityId);
  if (!withFields) return null;
  const subrows = await db
    .select()
    .from(activitySubrow)
    .where(eq(activitySubrow.activityId, id))
    .orderBy(asc(activitySubrow.sortOrder));
  return {
    activity: a,
    modality: withFields.modality,
    fields: withFields.fields,
    subrows,
    exercises: withFields.exercises,
    categories: withFields.categories,
  };
}

export type PlanListRow = Plan & { modalityName: string };

export async function getPlans(filters: { modalityId?: string }): Promise<PlanListRow[]> {
  const conditions = [isNull(plan.archivedAt)];
  if (filters.modalityId) conditions.push(eq(plan.modalityId, filters.modalityId));
  const rows = await db
    .select({ p: plan, modalityName: modality.name })
    .from(plan)
    .innerJoin(modality, eq(modality.id, plan.modalityId))
    .where(and(...conditions))
    .orderBy(asc(plan.name));
  return rows.map(({ p, modalityName }) => ({ ...p, modalityName }));
}

export type PlanDetail = {
  plan: Plan;
  modality: Modality;
  fields: PhysicalField[];
  exercises: Exercise[];
  categories: Category[];
  subrows: PlanSubrow[];
};

export async function getPlan(id: string): Promise<PlanDetail | null> {
  const [p] = await db.select().from(plan).where(eq(plan.id, id)).limit(1);
  if (!p) return null;
  const withFields = await getModalityWithFields(p.modalityId);
  if (!withFields) return null;
  const subrows = await db
    .select()
    .from(planSubrow)
    .where(eq(planSubrow.planId, id))
    .orderBy(asc(planSubrow.sortOrder));
  return {
    plan: p,
    modality: withFields.modality,
    fields: withFields.fields,
    exercises: withFields.exercises,
    categories: withFields.categories,
    subrows,
  };
}

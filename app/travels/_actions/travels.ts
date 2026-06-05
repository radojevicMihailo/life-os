"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { travel, type TravelRegion, type TravelStatus } from "@/db/schema/travels";
import {
  createTravelSchema,
  updateTravelSchema,
  travelRegionSchema,
  travelStatusSchema,
  type CreateTravelInput,
  type UpdateTravelInput,
} from "@/lib/validation/travels";
import { revalidateTravelRoutes } from "./_revalidate";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createTravel(
  input: CreateTravelInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTravelSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [row] = await db
    .insert(travel)
    .values({
      name: parsed.data.name,
      region: parsed.data.region ?? "srbija",
      status: parsed.data.status ?? "idea",
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
      people: parsed.data.people ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: travel.id });

  revalidateTravelRoutes();
  return { ok: true, data: { id: row.id } };
}

export async function updateTravel(input: UpdateTravelInput): Promise<ActionResult> {
  const parsed = updateTravelSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;

  await db
    .update(travel)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(travel.id, id));

  revalidateTravelRoutes();
  return { ok: true, data: undefined };
}

export async function setTravelStatus(
  id: string,
  status: TravelStatus,
): Promise<ActionResult> {
  const parsed = travelStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Invalid status");

  await db
    .update(travel)
    .set({ status: parsed.data, updatedAt: sql`now()` })
    .where(eq(travel.id, id));

  revalidateTravelRoutes();
  return { ok: true, data: undefined };
}

export async function setTravelRegion(
  id: string,
  region: TravelRegion,
): Promise<ActionResult> {
  const parsed = travelRegionSchema.safeParse(region);
  if (!parsed.success) return fail("Invalid region");

  await db
    .update(travel)
    .set({ region: parsed.data, updatedAt: sql`now()` })
    .where(eq(travel.id, id));

  revalidateTravelRoutes();
  return { ok: true, data: undefined };
}

export async function deleteTravel(id: string): Promise<ActionResult> {
  await db.delete(travel).where(eq(travel.id, id));
  revalidateTravelRoutes();
  return { ok: true, data: undefined };
}

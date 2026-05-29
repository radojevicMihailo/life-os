"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { priority } from "@/db/schema/tasks";
import {
  createPrioritySchema,
  updatePrioritySchema,
  type CreatePriorityInput,
  type UpdatePriorityInput,
} from "@/lib/validation/priorities";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/priorities");
}

export async function createPriority(
  input: CreatePriorityInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createPrioritySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const [row] = await db
      .insert(priority)
      .values({
        name: parsed.data.name,
        color: parsed.data.color ?? null,
      })
      .returning({ id: priority.id });
    revalidateAll();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate")) {
      return fail("Priority already exists");
    }
    throw e;
  }
}

export async function updatePriority(input: UpdatePriorityInput): Promise<ActionResult> {
  const parsed = updatePrioritySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db.update(priority).set(patch).where(eq(priority.id, id));
  revalidateAll();
  return { ok: true, data: undefined };
}

export async function deletePriority(id: string): Promise<ActionResult> {
  await db.delete(priority).where(eq(priority.id, id));
  revalidateAll();
  return { ok: true, data: undefined };
}

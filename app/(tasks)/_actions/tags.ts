"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tag, taskTag } from "@/db/schema/tasks";
import { createTagSchema, type CreateTagInput } from "@/lib/validation/tags";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/tags");
}

export async function createTag(
  input: CreateTagInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const [row] = await db
      .insert(tag)
      .values({ name: parsed.data.name, color: parsed.data.color ?? null })
      .returning({ id: tag.id });
    revalidateAll();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate")) {
      return fail("Tag already exists");
    }
    throw e;
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  await db.delete(tag).where(eq(tag.id, id));
  revalidateAll();
  return { ok: true, data: undefined };
}

export async function attachTag(taskId: string, tagId: string): Promise<ActionResult> {
  await db.insert(taskTag).values({ taskId, tagId }).onConflictDoNothing();
  revalidateAll();
  return { ok: true, data: undefined };
}

export async function detachTag(taskId: string, tagId: string): Promise<ActionResult> {
  await db
    .delete(taskTag)
    .where(and(eq(taskTag.taskId, taskId), eq(taskTag.tagId, tagId)));
  revalidateAll();
  return { ok: true, data: undefined };
}

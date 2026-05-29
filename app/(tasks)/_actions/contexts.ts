"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { context, taskContext } from "@/db/schema/tasks";
import {
  createContextSchema,
  updateContextSchema,
  type CreateContextInput,
  type UpdateContextInput,
} from "@/lib/validation/contexts";
import { revalidateTaskRoutes } from "./_revalidate";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function createContext(
  input: CreateContextInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createContextSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const [row] = await db
      .insert(context)
      .values({ name: parsed.data.name, color: parsed.data.color ?? null })
      .returning({ id: context.id });
    revalidateTaskRoutes();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate")) {
      return fail("Context already exists");
    }
    throw e;
  }
}

export async function updateContext(input: UpdateContextInput): Promise<ActionResult> {
  const parsed = updateContextSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...patch } = parsed.data;
  await db.update(context).set(patch).where(eq(context.id, id));
  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

export async function deleteContext(id: string): Promise<ActionResult> {
  await db.delete(context).where(eq(context.id, id));
  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

export async function attachContext(taskId: string, contextId: string): Promise<ActionResult> {
  await db.insert(taskContext).values({ taskId, contextId }).onConflictDoNothing();
  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

export async function detachContext(taskId: string, contextId: string): Promise<ActionResult> {
  await db
    .delete(taskContext)
    .where(and(eq(taskContext.taskId, taskId), eq(taskContext.contextId, contextId)));
  revalidateTaskRoutes();
  return { ok: true, data: undefined };
}

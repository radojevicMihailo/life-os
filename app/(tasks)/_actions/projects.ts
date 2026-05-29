"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { project } from "@/db/schema/tasks";
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/validation/projects";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function revalidateAll(id?: string) {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  if (id) revalidatePath(`/projects/${id}`);
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const [row] = await db
    .insert(project)
    .values({
      name: parsed.data.name,
      status: parsed.data.status ?? "active",
      startAt: parsed.data.startAt ?? null,
      dueAt: parsed.data.dueAt ?? null,
    })
    .returning({ id: project.id });

  revalidateAll();
  return { ok: true, data: { id: row.id } };
}

export async function updateProject(input: UpdateProjectInput): Promise<ActionResult> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, archived, name, status, startAt, dueAt } = parsed.data;

  await db
    .update(project)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(startAt !== undefined ? { startAt } : {}),
      ...(dueAt !== undefined ? { dueAt } : {}),
      ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(project.id, id));

  revalidateAll(id);
  return { ok: true, data: undefined };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await db.delete(project).where(eq(project.id, id));
  revalidateAll(id);
  return { ok: true, data: undefined };
}

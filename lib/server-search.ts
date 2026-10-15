import "server-only";
import { and, asc, desc, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { task, project } from "@/db/schema/tasks";
import { note } from "@/db/schema/notes";
import { literalSearchPattern, type SearchResult } from "./search";

export async function searchApplication(query: string): Promise<SearchResult[]> {
  const pattern = literalSearchPattern(query);
  const [tasks, projects, notes] = await Promise.all([
    db.select({ id: task.id, title: task.title }).from(task).where(or(ilike(task.title, pattern), ilike(task.notes, pattern))).orderBy(desc(task.updatedAt), asc(task.id)).limit(5),
    db.select({ id: project.id, title: project.name }).from(project).where(and(isNull(project.archivedAt), ilike(project.name, pattern))).orderBy(asc(project.name), asc(project.id)).limit(5),
    db.select({ id: note.id, title: note.title }).from(note).where(or(ilike(note.title, pattern), ilike(note.body, pattern))).orderBy(desc(note.updatedAt), asc(note.id)).limit(5),
  ]);
  return [
    ...tasks.map((item) => ({ ...item, href: `/tasks/${item.id}`, kind: "Zadatak" })),
    ...projects.map((item) => ({ ...item, href: `/projects/${item.id}`, kind: "Projekat" })),
    ...notes.map((item) => ({ ...item, href: `/notes/${item.id}`, kind: "Beleška" })),
  ];
}

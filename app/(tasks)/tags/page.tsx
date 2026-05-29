import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { tag, taskTag } from "@/db/schema/tasks";
import { TagForm } from "../_components/TagForm";
import { TagRow } from "../_components/TagRow";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tags = await db
    .select({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      taskCount: sql<number>`(SELECT COUNT(*) FROM ${taskTag} WHERE ${taskTag.tagId} = ${tag.id})`,
    })
    .from(tag)
    .orderBy(asc(tag.name));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground">{tags.length} total</p>
      </header>
      <TagForm />
      {tags.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          No tags yet.
        </div>
      ) : (
        <div className="space-y-1">
          {tags.map((t) => (
            <TagRow
              key={t.id}
              id={t.id}
              name={t.name}
              color={t.color}
              taskCount={Number(t.taskCount)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

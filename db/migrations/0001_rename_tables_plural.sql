-- Rename tables to plural. Run before next drizzle-kit push.
-- Postgres ALTER TABLE RENAME preserves data, indexes, FKs, and constraints.

ALTER TABLE "project" RENAME TO "projects";
ALTER TABLE "task" RENAME TO "tasks";
ALTER TABLE "priority" RENAME TO "priorities";
ALTER TABLE "context" RENAME TO "contexts";
ALTER TABLE "task_context" RENAME TO "task_contexts";

CREATE TABLE "note_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "notes" ADD COLUMN "category_id" uuid REFERENCES "note_categories"("id") ON DELETE SET NULL;
CREATE INDEX "notes_category_idx" ON "notes" ("category_id");

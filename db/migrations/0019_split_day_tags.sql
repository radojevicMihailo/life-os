ALTER TABLE "physical_split_days" DROP COLUMN "tag_id";
--> statement-breakpoint
CREATE TABLE "physical_split_day_tags" (
  "day_id" uuid NOT NULL REFERENCES "physical_split_days"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "activity_tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("day_id", "tag_id")
);
--> statement-breakpoint
CREATE INDEX "split_day_tag_tag_idx" ON "physical_split_day_tags" ("tag_id");

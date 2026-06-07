CREATE TYPE "goal_horizon" AS ENUM ('yearly', 'monthly', 'weekly', 'daily');
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "horizon" "goal_horizon" NOT NULL DEFAULT 'yearly';
--> statement-breakpoint
CREATE INDEX "goal_horizon_idx" ON "goals" ("horizon");

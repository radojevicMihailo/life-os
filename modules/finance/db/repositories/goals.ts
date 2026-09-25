import { and, eq } from "drizzle-orm";

import { applicationError } from "../../application/ports";
import type { DbTx } from "../client";
import { goals } from "../schema";

export type GoalRecord = typeof goals.$inferSelect;

export class GoalsRepository {
  constructor(private readonly tx: DbTx) {}

  async create(input: {
    id: string;
    name: string;
    accountId: string;
    targetCurrencyCode: string;
    targetAmount: string;
    now: Date;
  }): Promise<GoalRecord> {
    const [goal] = await this.tx
      .insert(goals)
      .values({
        ...input,
        archivedAt: null,
        createdAt: input.now,
        isActive: true,
        updatedAt: input.now,
      })
      .returning();

    if (!goal) {
      applicationError("goal_not_found");
    }

    return goal;
  }

  async lockById(id: string): Promise<GoalRecord> {
    const [goal] = await this.tx
      .select()
      .from(goals)
      .where(eq(goals.id, id))
      .for("update");

    if (!goal) {
      applicationError("goal_not_found");
    }

    return goal;
  }

  async hasActiveForAccount(accountId: string) {
    const rows = await this.tx
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.accountId, accountId), eq(goals.isActive, true)))
      .for("update");
    return rows.length > 0;
  }

  async update(input: {
    id: string;
    name: string;
    accountId: string;
    targetCurrencyCode: string;
    targetAmount: string;
    now: Date;
  }): Promise<GoalRecord> {
    const [goal] = await this.tx
      .update(goals)
      .set({
        name: input.name,
        accountId: input.accountId,
        targetCurrencyCode: input.targetCurrencyCode,
        targetAmount: input.targetAmount,
        updatedAt: input.now,
      })
      .where(eq(goals.id, input.id))
      .returning();
    if (!goal) applicationError("goal_not_found");
    return goal;
  }

  async archive(id: string, now: Date): Promise<GoalRecord> {
    const [goal] = await this.tx
      .update(goals)
      .set({ isActive: false, archivedAt: now, updatedAt: now })
      .where(eq(goals.id, id))
      .returning();
    if (!goal) applicationError("goal_not_found");
    return goal;
  }
}

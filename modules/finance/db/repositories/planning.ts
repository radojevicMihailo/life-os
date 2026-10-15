import { and, eq, inArray, sql } from "drizzle-orm";
import type { DbTx } from "../client";
import { planRules, planOccurrences } from "../schema";
import { applicationError } from "../../application/ports";
export class PlanningRepository {
    constructor(private readonly tx: DbTx) { }
    async lockRule(id: string) {
        const [rule] = await this.tx.select().from(planRules).where(eq(planRules.id, id)).for("update");
        if (!rule)
            applicationError("plan_not_found");
        return rule;
    }
    async listRules() { return this.tx.select().from(planRules).orderBy(planRules.startDate, planRules.id); }
    async getOccurrence(ruleId: string, dueDate: string) { const [row] = await this.tx.select().from(planOccurrences).where(and(eq(planOccurrences.ruleId, ruleId), eq(planOccurrences.dueDate, dueDate))); return row; }
}
/** Global planning lock keeps rule/journal lock ordering stable for link/correct/delete races. */
export async function lockPlanning(tx: DbTx) { await tx.execute(sql `select pg_advisory_xact_lock(91724003)`); }
export async function movePlannedJournal(tx: DbTx, originalId: string, replacementId: string | null, snapshot?: typeof planOccurrences.$inferInsert["snapshot"]) {
    if (replacementId)
        await tx.update(planOccurrences).set({ journalTransactionId: replacementId, ...(snapshot ? { snapshot } : {}), updatedAt: new Date() }).where(eq(planOccurrences.journalTransactionId, originalId));
    else
        await tx.delete(planOccurrences).where(eq(planOccurrences.journalTransactionId, originalId));
}
export async function hasPlannedReference(tx: DbTx, ids: string[]) { return (await tx.select({ id: planRules.id }).from(planRules).where(inArray(planRules.accountId, ids))).length > 0; }

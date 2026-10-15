import { describe, it, expect } from "vitest";
import { calculateGoalPlan } from "@/modules/finance/domain/goal-plan";
describe("goal savings plan", () => {
    const input = { targetAmount: "1000", fundedCash: "200", receivables: "300", targetDate: "2026-12-31", today: "2026-10-15", minorUnit: 2 };
    it("excludes receivables and rounds monthly saving upward", () => expect(calculateGoalPlan(input)).toMatchObject({ remaining: "800", monthly: "266.67", months: 3, status: "active" }));
    it("makes overdue shortfalls explicit", () => expect(calculateGoalPlan({ ...input, targetDate: "2026-10-14" })).toMatchObject({ status: "overdue", monthly: null }));
    it("does not invent deadlines", () => expect(calculateGoalPlan({ ...input, targetDate: null })).toMatchObject({ status: "no_deadline", monthly: null }));
    it("does not promise an estimate without conversion", () => expect(calculateGoalPlan({ ...input, fundedCash: null })).toMatchObject({ remaining: null, monthly: null }));
});

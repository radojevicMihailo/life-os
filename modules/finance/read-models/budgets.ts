import { projectBudget } from "../domain/budget-projection";
import { todayBelgrade, monthLength, monthEnd } from "../domain/calendar";
import { loadPlanningInTransaction } from "./planning";
import { HistoryRepository, historicalRate } from "../db/repositories/history";
import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";

import type { ApplicationDependencies } from "../application/ports";
import { budgetMonth } from "../domain/budgets";
import { budgetPeriods, categories } from "../db/schema";
import { canonicalDecimal } from "./common";

export interface BudgetReadModelItem {
  categoryId: string;
  categoryName: string;
  currencyCode: string;
  limitAmount: string;
  carryInAmount: string;
  availableAmount: string;
  spendingAmount: string;
  remainingAmount: string;
  recomputedAt: Date;
  projection: ReturnType<typeof projectBudget>;
  projectionComplete:boolean;
  projectionStale:boolean;
  previousMonths:{month:string;spent:string|null;currencyCode:string}[];
}

export async function listBudgets(
  dependencies: ApplicationDependencies,
  input: { month?: string } = {},
) {
  const month = input.month ?? budgetMonth(dependencies.clock.now());

  return dependencies.unitOfWork.run(async (tx) => {
    const rows = await tx
      .select({
        carryInAmount: budgetPeriods.carryInAmount,
        categoryId: budgetPeriods.categoryId,
        categoryName: categories.name,
        currencyCode: budgetPeriods.currencyCode,
        limitAmount: budgetPeriods.limitAmount,
        recomputedAt: budgetPeriods.recomputedAt,
        remainingAmount: budgetPeriods.remainingAmount,
        spendingAmount: budgetPeriods.spendingAmount,
      })
      .from(budgetPeriods)
      .innerJoin(categories, eq(categories.id, budgetPeriods.categoryId))
      .where(
        and(
          eq(budgetPeriods.month, `${month}-01`),
          eq(categories.classification, "expense"),
        ),
      )
      .orderBy(categories.name, categories.id);

    const today=todayBelgrade(dependencies.clock.now()),period=month<today.slice(0,7)?"past":month>today.slice(0,7)?"future":"current";
    const [planning,history,allPeriods]=[
await loadPlanningInTransaction(tx,dependencies.clock.now(),`${month}-01`,monthEnd(`${month}-01`)),
await new HistoryRepository(tx).load(dependencies.clock.now()),
await tx.select().from(budgetPeriods)
];
    const enhanced=rows.map(row=>{
      let pending=new Decimal(0),complete=true,stale=false;
      for(const item of planning.occurrences.filter(o=>o.status==="pending"&&o.type==="expense"&&o.categoryId===row.categoryId)) {
        if(item.currencyCode===row.currencyCode)pending=pending.plus(item.amount);
        else {
          const options={exchangeRateStaleAfterMs:36*3600000,marketDataStaleAfterMs:36*3600000};
          const from=historicalRate(history,item.currencyCode,dependencies.clock.now(),options),to=historicalRate(history,row.currencyCode,dependencies.clock.now(),options);
          if(!from||!to)complete=false;
          else {pending=pending.plus(new Decimal(item.amount).times(from.value).div(to.value));stale ||=from.stale||to.stale;}
        }
      }
      const previousMonths=Array.from({length:3},(_,i)=>{const date=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-2-i,1,12)),previous=date.toISOString().slice(0,7),previousRow=allPeriods.find(p=>p.categoryId===row.categoryId&&p.month.slice(0,7)===previous&&p.currencyCode===row.currencyCode);return {month:previous,spent:previousRow?canonicalDecimal(previousRow.spendingAmount):null,currencyCode:row.currencyCode};});
      const projection=projectBudget({available:new Decimal(row.limitAmount).plus(row.carryInAmount).toFixed(),spent:row.spendingAmount,pending:pending.toFixed(),elapsedDays:period==="past"?monthLength(`${month}-01`):period==="future"?0:Number(today.slice(8)),totalDays:monthLength(`${month}-01`),period});
      if(!complete)projection.projected=null;
      return {...row,projection,projectionComplete:complete,projectionStale:stale,previousMonths};
    });
    return {
      items: enhanced.map((row) => ({
        ...row,
        availableAmount: canonicalDecimal(
          new Decimal(row.limitAmount).plus(row.carryInAmount),
        ),
        carryInAmount: canonicalDecimal(row.carryInAmount),
        limitAmount: canonicalDecimal(row.limitAmount),
        remainingAmount: canonicalDecimal(row.remainingAmount),
        spendingAmount: canonicalDecimal(row.spendingAmount),
      } satisfies BudgetReadModelItem)),
      month,
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}

import { isValidElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays } from "date-fns";
import type { Habit, HabitLog } from "@/db/schema/habits";
import { isoDate } from "@/lib/habits/date";

const { select, where, orderBy } = vi.hoisted(() => ({
  select: vi.fn(), where: vi.fn(), orderBy: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select } }));
import HabitsPage from "./page";

function propsMatching(node: ReactNode, predicate: (props: Record<string, unknown>) => boolean): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(child => propsMatching(child, predicate));
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [
    ...(predicate(node.props) ? [node.props] : []),
    ...propsMatching(node.props.children as ReactNode, predicate),
  ];
}

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("habit page history", () => {
  it("displays a 100-day current/best streak instead of truncating it to the 30-day percentage window", async () => {
    vi.useFakeTimers();
    const today = new Date(2026, 9, 2, 12);
    vi.setSystemTime(today);
    const habit = {
      id: "habit-1", title: "Read", kind: "binary", cadence: "daily",
      startDate: isoDate(addDays(today, -99)), endDate: null, targetCount: 1,
      weeklyTarget: 0, weekdays: 127,
    } as Habit;
    const logs = Array.from({ length: 100 }, (_, index) => ({
      habitId: habit.id, date: isoDate(addDays(today, -index)), count: 1,
    })) as HabitLog[];
    select.mockReturnValue({ from: () => ({ where }) });
    where.mockReturnValueOnce({ orderBy });
    orderBy.mockResolvedValue([habit]);
    where.mockResolvedValueOnce(logs);
    const page = await HabitsPage();
    const [stats] = propsMatching(page, props => "best" in props && "current" in props);
    expect(stats).toMatchObject({ current: 100, best: 100, pct30: 100 });
    // One complete history query feeds all three sections; it is bounded above,
    // never at the start of the 30-day percentage window.
    expect(select).toHaveBeenCalledTimes(2);
    const condition = where.mock.calls[1][0];
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const sql = new PgDialect().sqlToQuery(condition);
    expect(sql.sql).toContain("<=");
    expect(sql.sql).not.toContain(">=");
    expect(sql.params).toContain(isoDate(today));
  });

  it("keeps a best streak from more than 30 days ago after a recent break", async () => {
    vi.useFakeTimers();
    const today = new Date(2026, 9, 2, 12);
    vi.setSystemTime(today);
    const habit = {
      id: "habit-1", title: "Read", kind: "binary", cadence: "daily",
      startDate: isoDate(addDays(today, -149)), endDate: null, targetCount: 1,
      weeklyTarget: 0, weekdays: 127,
    } as Habit;
    const logs = Array.from({ length: 90 }, (_, index) => ({
      habitId: habit.id, date: isoDate(addDays(today, -149 + index)), count: 1,
    })) as HabitLog[];
    select.mockReturnValue({ from: () => ({ where }) });
    where.mockReturnValueOnce({ orderBy });
    orderBy.mockResolvedValue([habit]);
    where.mockResolvedValueOnce(logs);
    const page = await HabitsPage();
    const [stats] = propsMatching(page, props => "best" in props && "current" in props);
    expect(stats).toMatchObject({ current: 0, best: 90, pct30: 0 });
  });
  it("separates completed habits from active daily/week rows and preserves their final statistics", async () => {
    vi.useFakeTimers();
    const today = new Date(2026, 9, 8, 12);vi.setSystemTime(today);
    const completed = {id:"completed",title:"September",kind:"binary",cadence:"daily",startDate:"2026-09-01",endDate:"2026-09-03",targetCount:1,weeklyTarget:0,weekdays:127} as Habit;
    const active = {...completed,id:"active",title:"October",startDate:"2026-10-01",endDate:null};
    const logs = ["2026-09-01","2026-09-02","2026-09-03"].map(date=>({habitId:completed.id,date,count:1})) as HabitLog[];
    select.mockReturnValue({from:()=>({where})});where.mockReturnValueOnce({orderBy});orderBy.mockResolvedValue([completed,active]);where.mockResolvedValueOnce(logs);
    const page = await HabitsPage();
    const stats = propsMatching(page, props => "best" in props && "current" in props);
    expect(stats.find(props=>(props.habit as Habit).id===completed.id)).toMatchObject({completed:true,current:3,best:3,pct30:100});
    const rows = propsMatching(page, props => "days" in props || "isoToday" in props);
    expect(rows.every(props=>(props.habit as Habit).id===active.id)).toBe(true);
    expect(propsMatching(page, props=>props.id==="active-habits")).toHaveLength(1);
    expect(propsMatching(page, props=>props.id==="completed-habits")).toHaveLength(1);
  });

});

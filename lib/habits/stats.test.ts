import {describe,it,expect} from "vitest";
import type {Habit} from "@/db/schema/habits";
import {bestStreak,currentStreak,completionPct30d} from "./stats";
const habit=(overrides:Partial<Habit>={}):Habit=>({id:"h",title:"Read",kind:"binary",cadence:"daily",startDate:"2026-09-01",endDate:"2026-09-03",targetCount:1,weeklyTarget:2,weekdays:127,...overrides} as Habit);
const logs=new Map([["2026-08-31",1],["2026-09-01",1],["2026-09-02",1],["2026-09-03",1],["2026-09-04",1]]);
describe("habit lifetime statistics",()=>{
 it("freezes completed daily statistics at the final day, even months later",()=>{
 const h=habit(),today=new Date(2026,11,1,12);expect(currentStreak(h,logs,today)).toBe(3);expect(bestStreak(h,logs,today)).toBe(3);expect(completionPct30d(h,logs,today)).toBe(100);
 });
 it("counts a missed final day and ignores logs outside the lifetime",()=>{
 const h=habit(),map=new Map(logs);map.delete("2026-09-03");const today=new Date(2026,11,1,12);
 expect(currentStreak(h,map,today)).toBe(0);expect(bestStreak(h,map,today)).toBe(2);expect(completionPct30d(h,map,today)).toBe(67);
 });
 it("returns zero before the start and does not read future weekly logs",()=>{
 const today=new Date(2026,7,31,12),h=habit({cadence:"weekly_target"});
 expect(currentStreak(h,logs,today)).toBe(0);expect(bestStreak(h,logs,today)).toBe(0);expect(completionPct30d(h,logs,today)).toBe(0);
 const active=habit({startDate:"2026-08-31",endDate:null,cadence:"weekly_target"});expect(currentStreak(active,new Map([["2026-09-01",1],["2026-09-02",1]]),today)).toBe(0);expect(bestStreak(active,new Map([["2026-09-01",1],["2026-09-02",1]]),today)).toBe(0);
 });
 it("freezes weekly streaks at completion and respects selected weekdays",()=>{
 const h=habit({startDate:"2026-08-24",endDate:"2026-09-02",cadence:"weekly_target"});
 const map=new Map([["2026-08-24",1],["2026-08-25",1],["2026-08-31",1],["2026-09-01",1]]);const today=new Date(2026,11,1,12);
 expect(currentStreak(h,map,today)).toBe(2);expect(bestStreak(h,map,today)).toBe(2);
 const weekdays=habit({startDate:"2026-08-31",endDate:"2026-09-04",cadence:"weekdays",weekdays:1|4|16});expect(completionPct30d(weekdays,new Map([["2026-08-31",1],["2026-09-02",1]]),today)).toBe(67);
 });
 it("does not penalize an active habit for today before it is logged",()=>{
 const h=habit({endDate:null});expect(currentStreak(h,new Map([["2026-09-01",1],["2026-09-02",1]]),new Date(2026,8,3,12))).toBe(2);
 });
});

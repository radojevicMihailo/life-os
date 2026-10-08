import { expect,it } from "vitest";
import { visibleGroups,tagConflicts } from "./tagSelection";
it("retains a selected group after placement changes",()=>{
 const groups=[{id:"g",placement:{scope:"block" as const,modes:[],kinds:["split" as const]}}],tags=[{id:"t",groupId:"g"}];
 expect(visibleGroups(groups,tags,["t"],{scope:"session",mode:"gym"})).toEqual(groups);
 expect(visibleGroups(groups,tags,[],{scope:"session",mode:"gym"})).toEqual([]);
});
it("defaults old groups to whole workout without inferring from names",()=>{
 const groups=[{id:"g",placement:null}];expect(visibleGroups(groups,[],[],{scope:"session",mode:"mixed"})).toEqual(groups);
 expect(visibleGroups(groups,[],[],{scope:"block",kind:"split"})).toEqual([]);
});
it("finds conflicts only within the same group",()=>{
 expect(tagConflicts(["a","b","c","a"],[{id:"a",groupId:"g"},{id:"b",groupId:"g"},{id:"c",groupId:"h"}])).toEqual([{groupId:"g",tagIds:["a","b"]}]);
});
it("replaces only the selected group and allows clearing it",async()=>{
 const {selectTag}=await import("./tagSelection");
 const tags=[{id:"a",groupId:"g"},{id:"b",groupId:"g"},{id:"c",groupId:"h"}];
 expect(selectTag(["a","c"],tags,"g","b")).toEqual(["c","b"]);
 expect(selectTag(["b","c"],tags,"g",null)).toEqual(["c"]);
});
it("shows only purpose-dependent sections even when historical selections exist",()=>{
 const condition={groupId:"purpose",tagIds:["strength","explosive","hypertrophy","emom"]};
 const groups=[{id:"purpose",placement:null},{id:"region",placement:{scope:"session" as const,modes:[],kinds:[],when:condition}},{id:"run",placement:{scope:"session" as const,modes:[],kinds:[],when:{groupId:"purpose",tagIds:["running"]}}}];
 const tags=[{id:"strength",groupId:"purpose"},{id:"running",groupId:"purpose"},{id:"easy",groupId:"run"}];
 expect(visibleGroups(groups,tags,[],{scope:"session",mode:"mixed"}).map(g=>g.id)).toEqual(["purpose"]);
 for(const id of condition.tagIds)expect(visibleGroups(groups,tags,[id,"easy"],{scope:"session",mode:"mixed"}).map(g=>g.id)).toEqual(["purpose","region"]);
 expect(visibleGroups(groups,tags,["running"],{scope:"session",mode:"gym"}).map(g=>g.id)).toEqual(["purpose","run"]);
});
it("uses session purpose for conditional labels within mixed workout blocks",()=>{
 const groups=[{id:"purpose",placement:null},{id:"run",placement:{scope:"block" as const,modes:[],kinds:["split" as const],when:{groupId:"purpose",tagIds:["running"]}}}];
 expect(visibleGroups(groups,[],[],{scope:"block",kind:"split"})).toEqual([]);
 expect(visibleGroups(groups,[],[],{scope:"block",kind:"split"},["running"])).toEqual([groups[1]]);
});
it("clears only dependent selections made irrelevant by a purpose change",async()=>{
 const {selectTagWithDependencies}=await import("./tagSelection");
 const groups=[{id:"region",placement:{scope:"session" as const,modes:[],kinds:[],when:{groupId:"purpose",tagIds:["strength"]}}}];
 const tags=[{id:"strength",groupId:"purpose"},{id:"running",groupId:"purpose"},{id:"upper",groupId:"region"},{id:"other",groupId:"custom"}];
 expect(selectTagWithDependencies(["strength","upper","other"],tags,groups,"purpose","running")).toEqual(["other","running"]);
});
it("rejects broken, foreign-option and circular display dependencies",async()=>{
 const {placementDependencyError}=await import("./tagSelection");
 const placement={scope:"session" as const,modes:[],kinds:[],when:{groupId:"purpose",tagIds:["strength"]}};
 const groups=[{id:"purpose",placement:null},{id:"region",placement:null}],tags=[{id:"strength",groupId:"purpose"}];
 expect(placementDependencyError("region",placement,groups,tags)).toBeNull();
 expect(placementDependencyError("region",placement,groups,[])).toBeTruthy();
 expect(placementDependencyError("region",{...placement,when:{groupId:"region",tagIds:["strength"]}},groups,tags)).toBeTruthy();
 expect(placementDependencyError("region",placement,[{id:"purpose",placement:{...placement,when:{groupId:"region",tagIds:["upper"]}}},{id:"region",placement:null}],tags)).toBeTruthy();
});
it("hides and clears inactive descendants through configurable dependency chains",async()=>{
 const {selectTagWithDependencies}=await import("./tagSelection");
 const p=(groupId:string,tagId:string)=>({scope:"session" as const,modes:[],kinds:[],when:{groupId,tagIds:[tagId]}});
 const groups=[{id:"A",placement:null},{id:"B",placement:p("A","a1")},{id:"C",placement:p("B","b")},{id:"D",placement:p("C","c")}];
 const tags=[{id:"a1",groupId:"A"},{id:"a2",groupId:"A"},{id:"b",groupId:"B"},{id:"c",groupId:"C"},{id:"d",groupId:"D"}];
 const next=selectTagWithDependencies(["a1","b","c","d"],tags,groups,"A","a2");
 expect(next).toEqual(["a2"]);
 expect(visibleGroups(groups,tags,["a2","b","c","d"],{scope:"session",mode:"mixed"}).map(g=>g.id)).toEqual(["A"]);
});

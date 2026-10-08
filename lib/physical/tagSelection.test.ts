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

import {expect,it} from "vitest";
import {adaptLegacyPlan,resolvePlanBlocks,combinePlanDrafts} from "./planAdapter";
import {newBlock} from "./blocks";
import {planFromActivity,draftFromPlan} from "./drafts";
import type {ActivityDraft} from "./types";
it("keeps legacy set goals and supersets separate from outcomes",()=>{
 const plan=adaptLegacyPlan([{exerciseId:"bench",setCount:3,sortOrder:0,linkNext:true},{exerciseId:"pull",setCount:3,sortOrder:1,linkNext:false}]);
 expect(plan.items[0].details.targets.setCount).toEqual({min:3,max:3});expect(plan.items[0].details.linkNext).toBe(true);expect(plan.items[0].values).toEqual({});
 expect(resolvePlanBlocks({version:1,items:[]},[{exerciseId:"bench",setCount:3,sortOrder:0,linkNext:false}]).items).toEqual([]);
});
it("preserves configurable workout tags in saved and loaded templates",()=>{
 const source:ActivityDraft={title:"Tempo",performedAt:new Date(),values:{},comment:null,stravaUrl:null,tagIds:["region"],blocks:[newBlock("split")]};
 const plan=planFromActivity(source,false),draft=draftFromPlan({name:"Tempo",notes:null,tagIds:[],blocks:plan},new Date());
 expect(draft.tagIds).toEqual(["region"]);expect(draft.blocks[0].values).toEqual({});
});
it("combines plans in order but does not link supersets across plan boundaries",()=>{
 const a:ActivityDraft={title:"a",performedAt:new Date(),values:{},comment:null,stravaUrl:null,tagIds:["a"],blocks:[newBlock("exercise")]};
 a.blocks[0].details.linkNext=true;const b={...a,title:"b",tagIds:["b"],blocks:[newBlock("exercise")]};
 const combined=combinePlanDrafts([a,b],"Dan",["c"],new Date());
 expect(combined.tagIds).toEqual(["c","a","b"]);expect(combined.blocks[0].details.linkNext).toBe(false);expect(combined.blocks.map(x=>x.sortOrder)).toEqual([0,1]);
});
it("removes deleted options from templates without losing live selections",async()=>{
 const {sanitizePlanTags}=await import("./planAdapter");
 const b=newBlock("split"),{status,...details}=b.details;void status;
 const cleaned=sanitizePlanTags({version:1,tagIds:["live","deleted"],items:[{...b,details,tagIds:["deleted","live"]}]},[{id:"live"}]);
 expect(cleaned.tagIds).toEqual(["live"]);expect(cleaned.items[0].tagIds).toEqual(["live"]);
});

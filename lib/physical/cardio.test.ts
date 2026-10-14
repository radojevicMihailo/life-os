import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it} from "vitest";
import {newBlock,inferEntryMode,toActivityWrite} from "./blocks";
import {trainingBlockSchema,planBlocksSchema,placementSchema} from "./trainingSchemas";
import {activityPayloadSchema} from "@/lib/validation/physical";
import {summarizeActivity} from "./activitySummary";
import {repeatActivity,planFromActivity,draftFromPlan} from "./drafts";
import {describeBlock} from "./display";
import {BlockEditor} from "@/app/(physical)/_components/activity/BlockEditor";
import type {ActivityDraft,TrainingBlock} from "./types";
const bike=():TrainingBlock=>({...newBlock("cardio"),details:{...newBlock("split").details,cardioType:"stationary_bike" as const,status:"done" as const},values:{duration:1800,distance:12.5,resistance:6,averageHeartRate:135,calories:240}});
const draft=():ActivityDraft=>({title:null,performedAt:new Date(),values:{},comment:null,stravaUrl:null,tagIds:[],blocks:[bike()]});
it("accepts duration-only cardio through both activity validation boundaries",()=>{
 const b=bike();b.values={duration:1800};
 expect(trainingBlockSchema.safeParse(b).success).toBe(true);
 const payload=activityPayloadSchema([],[]).parse(toActivityWrite({...draft(),blocks:[b]}));
 expect(payload.subrows[0].details).toMatchObject({cardioType:"stationary_bike"});
});
it("requires positive duration and a named custom cardio activity",()=>{
 for(const values of [{distance:12.5},{duration:0},{duration:-1},{duration:1800,averageHeartRate:-1},{duration:1800,floors:1.5}])expect(trainingBlockSchema.safeParse({...bike(),values}).success).toBe(false);
 expect(trainingBlockSchema.safeParse({...bike(),details:{...bike().details,cardioType:"other",cardioName:"  "}}).success).toBe(false);
 expect(trainingBlockSchema.safeParse({...bike(),details:{...bike().details,cardioType:"other",cardioName:"Aerobik"}}).success).toBe(true);
});
it("keeps running distance and pace independent of cardio and excludes skipped work",()=>{
 const run=newBlock("split");run.details.status="done";run.values={distance:5,duration:1500};
 const skip=bike();skip.details.status="skipped";
 const result=summarizeActivity([run,bike(),skip]);
 expect(result).toMatchObject({distanceKm:5,activeRunSeconds:1500,runPaceSeconds:300,distanceComplete:true,activeCardioSeconds:1800});
 expect(result.cardio).toEqual([{name:"Sobni bicikl",durationSec:1800,distanceKm:12.5}]);
 expect(inferEntryMode([bike()],"running")).toBe("cardio");
 expect(inferEntryMode([run,bike()],"running")).toBe("mixed");
 expect(inferEntryMode([newBlock("exercise"),bike()],"gym")).toBe("mixed");
});
it("preserves cardio type and run surface when repeating and removes all measured results",()=>{
 const source=draft();source.blocks[0].details.note="Zagrevanje";
 const run=newBlock("split");run.details.runSurface="treadmill";run.values={duration:600};source.blocks.push(run);
 const repeat=repeatActivity(source,new Date());
 expect(repeat.blocks[0].details).toMatchObject({cardioType:"stationary_bike",status:"pending"});
 expect(repeat.blocks[0].values).toEqual({});
 expect(repeat.blocks[1].details.runSurface).toBe("treadmill");
 const plan=planFromActivity(source,true);
 expect(plan.items[0].values).toEqual({});
 expect(plan.items[0].details.targets.durationSec).toEqual({min:1800,max:1800});
 expect(planBlocksSchema.safeParse(plan).success).toBe(true);
 expect(draftFromPlan({name:"Zagrevanje",notes:null,tagIds:[],blocks:plan},new Date()).blocks[0]).toMatchObject({values:{},details:{cardioType:"stationary_bike",status:"pending"}});
 expect(planBlocksSchema.safeParse({...plan,items:[{...plan.items[0],values:{resistance:6}}]}).success).toBe(false);
});
it("renders cardio controls and reports machine details without a running pace",()=>{
 const html=renderToStaticMarkup(createElement(BlockEditor,{blocks:[bike()],onChange:()=>{},mode:"actual",exercises:[],exerciseGroups:[],tagGroups:[],tags:[],subrowFields:[]}));
 expect(html).toContain("Sobni bicikl");expect(html).toContain("Prosečan puls");expect(html).toContain("Nivo otpora");
 const description=describeBlock(bike());
 expect(description).toContain("Sobni bicikl");expect(description).toContain("12,5 km");expect(description).toContain("135 bpm");expect(description).not.toContain("/km");
 expect(placementSchema.safeParse({scope:"block",modes:["cardio"],kinds:["cardio"]}).success).toBe(true);
});
it("rejects cardio payloads that omit details instead of bypassing result validation",()=>{
 const payload=toActivityWrite(draft());
 expect(activityPayloadSchema([],[]).safeParse({...payload,subrows:[{...payload.subrows[0],details:null}]}).success).toBe(false);
});
it("shows only fields relevant to the chosen cardio type and keeps templates free of results",()=>{
 const render=(b:TrainingBlock,mode:"actual"|"template"="actual")=>renderToStaticMarkup(createElement(BlockEditor,{blocks:[b],onChange:()=>{},mode,exercises:[],exerciseGroups:[],tagGroups:[],tags:[],subrowFields:[]}));
 const stepper=bike();stepper.details.cardioType="stepper";
 expect(render(stepper)).toContain("Spratovi");expect(render(stepper)).not.toContain("Nivo otpora");
 const walk=bike();walk.details.cardioType="walking";walk.details.runSurface="treadmill";
 expect(render(walk)).toContain("Nagib");
 walk.details.runSurface="outdoor";expect(render(walk)).not.toContain("Nagib");
 expect(render(bike(),"template")).not.toContain("Prosečan puls");
 expect(render(bike(),"template")).toContain("Ciljevi ostaju odvojeni od rezultata");
});

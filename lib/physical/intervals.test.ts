import {describe,it,expect} from "vitest";
import {intervalTotals,parseMinutesSeconds,progressionExample} from "./intervals";
import {newBlock,toActivityWrite} from "./blocks";
import {trainingBlockSchema,planBlocksSchema} from "./trainingSchemas";
import {summarizeActivity} from "./activitySummary";
import {describeBlock} from "./display";
import {planFromActivity,draftFromPlan,repeatActivity} from "./drafts";
const block=()=>{const b=newBlock("interval");b.details.status="done";b.values={segments:progressionExample()};return b;};
describe("intervals",()=>{
 it("calculates the user's five ordered kilometers with mixed duration and pace",()=>{
 const b=block();expect(intervalTotals(progressionExample())).toEqual({distance:5,duration:1710,distanceComplete:true,timeComplete:true});
 expect(trainingBlockSchema.safeParse(b).success).toBe(true);
 expect(summarizeActivity([b])).toMatchObject({distanceKm:5,activeRunSeconds:1710,runPaceSeconds:342});
 expect(describeBlock(b)).toContain("3. Tempo · 1 km · 4:50 /km");
 });
 it("rejects empty, incomplete, negative, or conflicting completed segments",()=>{
 const b=block();for(const segments of [[],[{label:"",distance:null,duration:420,pace:null}],[{label:"",distance:1,duration:null,pace:null}],[{label:"",distance:-1,duration:420,pace:null}],[{label:"",distance:1,duration:420,pace:300}]]){b.values={segments};expect(trainingBlockSchema.safeParse(b).success).toBe(false);}
 });
 it("excludes skipped intervals and leaves partial totals incomplete",()=>{
 const b=block();b.details.status="skipped";expect(summarizeActivity([b]).distanceKm).toBe(0);
 b.details.status="done";b.values={segments:[...progressionExample(),{label:"Oporavak",distance:null,duration:60,pace:null}]};expect(summarizeActivity([b])).toMatchObject({distanceKm:5,distanceComplete:false,activeRunSeconds:1770,runPaceSeconds:null});
 });
 it("round-trips intervals through save and templates without copying actuals into a repeat",()=>{
 const source={title:"Progresivno",performedAt:new Date(),values:{},comment:null,stravaUrl:null,tagIds:[],blocks:[block()]};
 expect(toActivityWrite(source).subrows[0].values.segments).toEqual(progressionExample());
 const plan=planFromActivity(source,true);expect(planBlocksSchema.safeParse(plan).success).toBe(true);expect(plan.items[0].details.intervalTargets).toEqual(progressionExample());expect(plan.items[0].values.segments).toBeUndefined();
 const draft=draftFromPlan({name:"Progresivno",notes:null,tagIds:[],blocks:plan},new Date());expect(draft.blocks[0].details.intervalTargets).toEqual(progressionExample());
 for(const next of [draft,repeatActivity(source,new Date())]){expect(next.blocks[0].details.status).toBe("pending");expect(next.blocks[0].values.segments).toEqual(progressionExample().map(s=>({...s,distance:null,duration:null,pace:null})));}
 });
 it("preserves custom template values and does not promote unfinished results",()=>{
 const source={title:"Progresivno",performedAt:new Date(),values:{},comment:null,stravaUrl:null,tagIds:[],blocks:[block()]};
 source.blocks[0].values.custom="keep";
 const plan=planFromActivity(source,true),draft=draftFromPlan({name:"Progresivno",notes:null,tagIds:[],blocks:plan},new Date());
 expect(draft.blocks[0].values.custom).toBe("keep");
 for(const status of ["pending","skipped"] as const){draft.blocks[0].details.status=status;expect(planFromActivity(draft,true).items[0].details.intervalTargets).toEqual(progressionExample());}
 });
 it("parses minute-second input without accepting invalid seconds",()=>{
 expect(parseMinutesSeconds("4:50")).toBe(290);expect(parseMinutesSeconds("7:00")).toBe(420);for(const s of ["4:60","4.50","-1:00","0:00",""])expect(parseMinutesSeconds(s)).toBeNull();
 });
});

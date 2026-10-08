import { expect,it } from "vitest";
import { newBlock } from "./blocks";
import { repeatActivity,draftFromPlan,planFromActivity } from "./drafts";
import type { ActivityDraft } from "./types";
const source=():ActivityDraft=>{const b=newBlock("split");b.id="oldrow";b.values={distance:8,duration:2400};b.details.status="done";return {id:"old",title:"Tempo",performedAt:new Date("2026-10-01T10:00:00Z"),values:{extra:1},comment:"old",stravaUrl:"https://www.strava.com/activities/1",tagIds:["tag"],blocks:[b]};};
it("repeats structure with today and blank outcomes without mutating source",()=>{
 const old=source(), today=new Date("2026-10-08T10:00:00Z"),next=repeatActivity(old,today);
 expect(next.id).toBeUndefined();expect(next.blocks[0].id).toBeUndefined();expect(next.performedAt).toEqual(today);
 expect(next.blocks[0].values).toEqual({});expect(next.blocks[0].details.status).toBe("pending");
 expect(next.stravaUrl).toBeNull();expect(next.comment).toBeNull();expect(old.blocks[0].values.distance).toBe(8);
});
it("copies actual values into targets only after explicit selection",()=>{
 expect(planFromActivity(source(),false).items[0].details.targets).toEqual({});
 const plan=planFromActivity(source(),true);expect(plan.items[0].details.targets.distanceKm).toEqual({min:8,max:8});
 expect(plan.items[0].values).toEqual({});
 const draft=draftFromPlan({name:"Tempo",notes:"goal",tagIds:[],blocks:plan},new Date());
 expect(draft.blocks[0].values).toEqual({});expect(draft.blocks[0].details.status).toBe("pending");
});
it("preserves template custom instructions when reopened without copying actual result keys",()=>{
 const plan=planFromActivity(source(),false);plan.items[0].values={terrain:"brdo",custom:{cue:"lagano"}};
 const reopened=draftFromPlan({name:"Petak",notes:null,tagIds:[],blocks:plan},new Date());
 expect(planFromActivity(reopened,false).items[0].values).toEqual(plan.items[0].values);
});
it("replaces stale exercise targets with achieved repetition and timed set ranges",()=>{
 const d=source(),b=newBlock("exercise");b.details.status="done";b.details.targets={reps:{min:8,max:8},durationSec:{min:20,max:20}};b.values={sets:[{reps:12},{reps:10}]};d.blocks=[b];
 expect(planFromActivity(d,true).items[0].details.targets).toEqual({setCount:{min:2,max:2},reps:{min:10,max:12}});
 b.values={sets:[{durationSec:45},{durationSec:60}]};
 expect(planFromActivity(d,true).items[0].details.targets).toEqual({setCount:{min:2,max:2},durationSec:{min:45,max:60}});
});

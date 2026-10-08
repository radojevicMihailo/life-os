import { expect,it } from "vitest";
import { newBlock } from "./blocks";
import { summarizeActivity } from "./activitySummary";
it("does not invent distance or compute incomplete pace",()=>{
 const run=newBlock("split"),warmup=newBlock("split"),sprint=newBlock("sprint");
 for(const b of [run,warmup,sprint])b.details.status="done";
 run.values={distance:4,duration:1200};warmup.values={duration:420};sprint.values={sprintReps:4,sprintDuration:10,sprintRest:120};
 expect(summarizeActivity([run,warmup,sprint])).toMatchObject({distanceKm:4,distanceComplete:false,activeRunSeconds:1660,runPaceSeconds:null,exerciseCount:0});
});
it("excludes skipped/planned work and weights run pace by distance",()=>{
 const a=newBlock("split"),b=newBlock("split"),skip=newBlock("split"),pending=newBlock("split");
 a.values={distance:2,duration:600};b.values={distance:4,duration:1440};skip.values={distance:10,duration:3600};pending.details.targets.distanceKm={min:20,max:20};
 a.details.status=b.details.status="done";skip.details.status="skipped";
 expect(summarizeActivity([a,b,skip,pending])).toMatchObject({distanceKm:6,activeRunSeconds:2040,runPaceSeconds:340,distanceComplete:true});
});
it("includes sprint meters and time but not rests or sprint pace in running pace",()=>{
 const run=newBlock("split"),sprint=newBlock("sprint");run.details.status=sprint.details.status="done";
 run.values={distance:5,duration:1500};sprint.values={sprintDistance:100,sprintReps:4,sprintDuration:10,sprintRest:120};
 expect(summarizeActivity([run,sprint])).toMatchObject({distanceKm:5.4,activeRunSeconds:1540,runPaceSeconds:300});
});

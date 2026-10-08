import type { SetEntry,Summary,TrainingBlock } from "./types";
const positive=(v:unknown):number=>typeof v==="number"&&Number.isFinite(v)&&v>0?v:0;
export function summarizeActivity(rows:TrainingBlock[]):Summary{
 const s:Summary={distanceKm:0,distanceComplete:true,activeRunSeconds:0,timeComplete:true,runPaceSeconds:null,exerciseCount:0,setCount:0};
 let runDistance=0,runTime=0,completeRuns=true;
 for(const b of rows){if(b.details.status!=="done")continue;
 if(b.kind==="exercise"){if(b.exerciseId)s.exerciseCount++;s.setCount+=(Array.isArray(b.values.sets)?b.values.sets as SetEntry[]:[]).filter(x=>positive(x.reps)||positive(x.durationSec)).length;continue;}
 const reps=b.kind==="sprint"?positive(b.values.sprintReps):1;
 const distance=b.kind==="sprint"?positive(b.values.sprintDistance)*reps/1000:positive(b.values.distance);
 const time=b.kind==="sprint"?positive(b.values.sprintDuration)*reps:positive(b.values.duration);
 s.distanceKm+=distance;s.activeRunSeconds+=time;if(!distance)s.distanceComplete=false;if(!time)s.timeComplete=false;
 if(b.kind==="split"){runDistance+=distance;runTime+=time;if(!distance||!time)completeRuns=false;}
 }
 s.distanceKm=Math.round(s.distanceKm*10000)/10000;
 if(completeRuns&&runDistance>0&&runTime>0)s.runPaceSeconds=Math.round(runTime/runDistance);
 return s;
}

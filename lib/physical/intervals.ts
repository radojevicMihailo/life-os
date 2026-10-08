export type IntervalSegment = { label: string; timeMode?: "duration" | "pace"; distance: number | null; duration: number | null; pace: number | null };
export function intervalSeconds(segment: IntervalSegment): number | null {
 if(segment.duration!=null&&segment.duration>0)return segment.duration;
 return segment.distance!=null&&segment.distance>0&&segment.pace!=null&&segment.pace>0?Math.round(segment.distance*segment.pace):null;
}
export function intervalTotals(segments: IntervalSegment[]) {
 return segments.reduce((sum,s)=>({distance:sum.distance+(s.distance??0),duration:sum.duration+(intervalSeconds(s)??0),distanceComplete:sum.distanceComplete&&!!s.distance,timeComplete:sum.timeComplete&&intervalSeconds(s)!=null}),{distance:0,duration:0,distanceComplete:segments.length>0,timeComplete:segments.length>0});
}
export function parseMinutesSeconds(text:string):number|null {
 const match=/^(\d+):([0-5]\d)$/.exec(text.trim());if(!match)return null;
 const seconds=Number(match[1])*60+Number(match[2]);return seconds>0?seconds:null;
}
export function progressionExample():IntervalSegment[]{return [{label:"Zagrevanje",distance:1,duration:420,pace:null},...([300,290,280].map(pace=>({label:"Tempo",distance:1,duration:null,pace}))),{label:"Rastrčavanje",distance:1,duration:420,pace:null}];}

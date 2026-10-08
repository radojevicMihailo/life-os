import type {Summary} from "@/lib/physical/types";
import {secondsToHhmmss,secondsToMmSs} from "@/lib/physical/formatDuration";
export function ActivityMetrics({summary}:{summary:Summary}){
 const items=[...(summary.distanceKm>0?[{label:summary.distanceComplete?"Distanca":"Unesena distanca",value:`${new Intl.NumberFormat("sr-RS",{maximumFractionDigits:2}).format(summary.distanceKm)} km`}]:[]),...(summary.activeRunSeconds>0?[{label:summary.timeComplete?"Aktivno vreme trčanja":"Uneseno vreme trčanja",value:secondsToHhmmss(summary.activeRunSeconds)}]:[]),...(summary.runPaceSeconds!=null?[{label:"Tempo trčanja",value:`${secondsToMmSs(summary.runPaceSeconds)} /km`}]:[]),...(summary.exerciseCount>0?[{label:"Vežbe / serije",value:`${summary.exerciseCount} / ${summary.setCount}`}]:[])];
 if(!items.length)return null;
 return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map(item=><div key={item.label} className="rounded-xl border bg-muted/20 p-3"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums">{item.value}</dd></div>)}</dl>;
}

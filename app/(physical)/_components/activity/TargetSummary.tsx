import type {BlockTargets} from "@/lib/physical/types";
const labels={distanceKm:"km",durationSec:"s",repetitions:"sprintova",sprintDistanceM:"m po sprintu",sprintDurationSec:"s po sprintu",restSec:"s pauze",setCount:"serija",reps:"ponavljanja"};
export function TargetSummary({targets}:{targets:BlockTargets}){
 const entries=Object.entries(targets) as [keyof BlockTargets,{min:number;max:number}][];
 if(!entries.length)return null;
 return <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Cilj: </span>{entries.map(([key,r])=>`${r.min===r.max?r.min:`${r.min}–${r.max}`} ${labels[key]}`).join(" · ")}</p>;
}

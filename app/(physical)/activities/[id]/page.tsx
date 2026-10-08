import Link from "next/link";
import {notFound} from "next/navigation";
import {getActivity,getExercises,getTags} from "@/lib/queries/physical";
import {adaptStoredBlock,inferEntryMode} from "@/lib/physical/blocks";
import {summarizeActivity} from "@/lib/physical/activitySummary";
import {describeBlock,blockKindLabels} from "@/lib/physical/display";
import {supersetLabels} from "@/lib/physical/supersets";
import {ActivityMetrics} from "../../_components/activity/ActivityMetrics";
import {SaveTemplateDialog} from "../../_components/activity/SaveTemplateDialog";
import {TargetSummary} from "../../_components/activity/TargetSummary";
import {Button} from "@/components/ui/button";
export const dynamic="force-dynamic";
export default async function ActivityDetailPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,data=await getActivity(id);if(!data)notFound();
 const blocks=data.subrows.map(adaptStoredBlock),[exercises,tags]=await Promise.all([getExercises(blocks.flatMap(b=>b.exerciseId?[b.exerciseId]:[])),getTags()]);
 const names=new Map(exercises.map(e=>[e.id,e.name])),tagNames=new Map(tags.map(t=>[t.id,t.name])),labels=supersetLabels(blocks);
 const mode=inferEntryMode(blocks,"mixed"),title=data.activity.title||({running:"Trčanje",gym:"Teretana",mixed:"Kombinovani trening"}[mode]);
 const draft={...data.activity,values:(data.activity.values??{}) as Record<string,unknown>,tagIds:data.tagIds,blocks};
 return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"><Link href="/activities" className="text-sm text-muted-foreground hover:underline">← Aktivnosti</Link><header className="space-y-3"><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{new Date(data.activity.performedAt).toLocaleString("sr-RS")}</p><p className="text-sm">{data.tagIds.map(t=>tagNames.get(t)).filter(Boolean).join(" · ")}</p><div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href={`/activities/${id}/edit`}>Izmeni</Link></Button><Button asChild size="sm" variant="outline"><Link href={`/activities/new?source=activity:${id}`}>Ponovi trening</Link></Button><SaveTemplateDialog draft={draft}/></div></header><ActivityMetrics summary={summarizeActivity(blocks)}/><ol className="space-y-3">{blocks.map((b,i)=><li key={b.rowKey} className="space-y-3 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{labels[i]?`${labels[i]} · `:`${i+1}. `}{b.details.label||(b.exerciseId?names.get(b.exerciseId):null)||blockKindLabels[b.kind]}</h2><span className="rounded-md bg-muted px-2 py-1 text-xs">{{done:"Urađeno",pending:"Za unos",skipped:"Preskočeno"}[b.details.status]}{b.details.optional?" · Opciono":""}</span></div><p className="text-sm text-muted-foreground">{b.tagIds.map(t=>tagNames.get(t)).filter(Boolean).join(" · ")}</p><p className="text-sm">{describeBlock(b)}</p><TargetSummary targets={b.details.targets}/>{b.details.restSec!=null&&<p className="text-sm text-muted-foreground">Pauza između serija: {b.details.restSec} s</p>}{b.details.note&&<p className="whitespace-pre-wrap text-sm">{b.details.note}</p>}</li>)}</ol>{data.activity.comment&&<section><h2 className="mb-2 font-medium">Beleška treninga</h2><p className="whitespace-pre-wrap text-sm">{data.activity.comment}</p></section>}{data.activity.stravaUrl&&<a href={data.activity.stravaUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">Otvori na Stravi</a>}</main>;
}

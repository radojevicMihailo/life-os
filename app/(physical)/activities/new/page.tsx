import Link from "next/link";
import {ChevronLeft} from "lucide-react";
import {getRecordingCatalog,getRecordingSources} from "@/lib/queries/physical";
import {ActivityForm} from "../../_components/activity/ActivityForm";
export const dynamic="force-dynamic";
export default async function NewActivityPage({searchParams}:{searchParams:Promise<{source?:string}>}){
 const params=await searchParams;
 const requestedSource=typeof params.source==="string"?params.source:undefined;
 const sources=await getRecordingSources(requestedSource);
 const catalog=await getRecordingCatalog(sources.flatMap(s=>s.draft.blocks.flatMap(b=>b.exerciseId?[b.exerciseId]:[])));
 const sourceExists=!requestedSource||sources.some(s=>`${s.kind}:${s.id}`===requestedSource);
 return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"><Link href="/activities" className="inline-flex items-center text-sm text-muted-foreground hover:underline"><ChevronLeft className="size-4"/>Aktivnosti</Link><div><h1 className="text-2xl font-semibold">Zabeleži trening</h1><p className="mt-1 text-sm text-muted-foreground">Jedan trening, svi njegovi delovi.</p></div>{!sourceExists&&<p role="alert" className="text-sm text-muted-foreground">Izabrani izvor više nije dostupan. Možeš započeti novi trening.</p>}<ActivityForm key={requestedSource??"new"} {...catalog} sources={sources} requestedSource={sourceExists?requestedSource:undefined}/></div>;
}

"use client";
import {useState,useTransition} from "react";
import {toast} from "sonner";
import type {TagPlacement} from "@/lib/physical/types";
import type {ActivityTag,ActivityTagGroup} from "@/db/schema/physical";
import {updateTagGroupPlacement} from "../_actions/tagGroups";
import {Button} from "@/components/ui/button";

export function TagPlacementEditor({group,groups,tags}:{group:ActivityTagGroup;groups:ActivityTagGroup[];tags:ActivityTag[]}){
 const initial=group.placement??{scope:"session" as const,modes:[],kinds:[]};
 const [placement,setPlacement]=useState<TagPlacement>(initial),[pending,startTransition]=useTransition();
 function save(next:TagPlacement){
  const previous=placement;setPlacement(next);
  startTransition(async()=>{const result=await updateTagGroupPlacement({id:group.id,placement:next});if(!result.ok){setPlacement(previous);toast.error(result.error);}});
 }
 const choices=placement.scope==="session"?[{key:"running",label:"Trčanje"},{key:"gym",label:"Teretana"},{key:"mixed",label:"Kombinovano"}]:[{key:"split",label:"Trčanje"},{key:"exercise",label:"Vežbe"},{key:"sprint",label:"Sprintovi"},{key:"interval",label:"Intervali"}];
 const selected=placement.scope==="session"?placement.modes:placement.kinds;
 const parents=groups.filter(g=>g.id!==group.id&&tags.some(t=>t.groupId===g.id));
 const parentTags=tags.filter(t=>t.groupId===placement.when?.groupId);
 return <div className="space-y-3 rounded-lg bg-muted/30 p-3">
  <label className="block text-xs font-medium">Mesto prikaza<select className="mt-1 w-full" disabled={pending} value={placement.scope} onChange={e=>save({...placement,scope:e.target.value as TagPlacement["scope"]})}><option value="session">Ceo trening</option><option value="block">Deo treninga</option></select></label>
  <div className="flex flex-wrap gap-2">{choices.map(c=><Button key={c.key} type="button" size="sm" disabled={pending} variant={(selected as string[]).includes(c.key)?"secondary":"outline"} aria-pressed={(selected as string[]).includes(c.key)} onClick={()=>{const next=(selected as string[]).includes(c.key)?selected.filter(x=>x!==c.key):[...selected,c.key];save(placement.scope==="session"?{...placement,modes:next as TagPlacement["modes"]}:{...placement,kinds:next as TagPlacement["kinds"]});}}>{c.label}</Button>)}</div>
  <label className="block text-xs font-medium">Prikaži samo uz izbor iz grupe<select className="mt-1 w-full" disabled={pending} value={placement.when?.groupId??""} onChange={e=>{const id=e.target.value;save({...placement,when:id?{groupId:id,tagIds:[tags.find(t=>t.groupId===id)!.id]}:undefined});}}><option value="">Bez uslova</option>{parents.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
  {placement.when&&<fieldset className="space-y-2"><legend className="mb-2 text-xs">Dovoljan je jedan od ovih izbora</legend><div className="flex flex-wrap gap-2">{parentTags.map(t=>{const chosen=placement.when!.tagIds.includes(t.id);return <Button key={t.id} type="button" size="sm" disabled={pending||(chosen&&placement.when!.tagIds.length===1)} variant={chosen?"secondary":"outline"} aria-pressed={chosen} onClick={()=>save({...placement,when:{groupId:placement.when!.groupId,tagIds:chosen?placement.when!.tagIds.filter(id=>id!==t.id):[...placement.when!.tagIds,t.id]}})}>{t.name}</Button>;})}</div></fieldset>}
  <p className="text-xs text-muted-foreground">Bez ograničenja: prikazuje se svuda na izabranom mestu. Uslov koristi sačuvane opcije, pa preimenovanje ne menja pravilo.</p>
 </div>;
}

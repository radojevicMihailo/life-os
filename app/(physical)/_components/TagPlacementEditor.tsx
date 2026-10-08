"use client";
import { useState,useTransition } from "react";
import { toast } from "sonner";
import type { TagPlacement } from "@/lib/physical/types";
import type { ActivityTagGroup } from "@/db/schema/physical";
import { updateTagGroupPlacement } from "../_actions/tagGroups";
import { Button } from "@/components/ui/button";
export function TagPlacementEditor({group}:{group:ActivityTagGroup}){
 const [placement,setPlacement]=useState<TagPlacement>(group.placement??{scope:"session",modes:[],kinds:[]});
 const [pending,startTransition]=useTransition();
 function save(next:TagPlacement){setPlacement(next);startTransition(async()=>{const result=await updateTagGroupPlacement({id:group.id,placement:next});if(!result.ok){setPlacement(group.placement??{scope:"session",modes:[],kinds:[]});toast.error(result.error);}});}
 const choices=placement.scope==="session"?[{key:"running",label:"Trčanje"},{key:"gym",label:"Teretana"},{key:"mixed",label:"Kombinovano"}]:[{key:"split",label:"Trčanje"},{key:"exercise",label:"Vežbe"},{key:"sprint",label:"Sprintovi"}];
 const selected=placement.scope==="session"?placement.modes:placement.kinds;
 return <div className="space-y-2 rounded-lg bg-muted/30 p-3"><label className="block text-xs font-medium">Mesto prikaza<select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" disabled={pending} value={placement.scope} onChange={e=>save({...placement,scope:e.target.value as TagPlacement["scope"]})}><option value="session">Ceo trening</option><option value="block">Deo treninga</option></select></label><div className="flex flex-wrap gap-2">{choices.map(c=><Button key={c.key} type="button" size="sm" disabled={pending} variant={(selected as string[]).includes(c.key)?"secondary":"outline"} aria-pressed={(selected as string[]).includes(c.key)} onClick={()=>{const next=(selected as string[]).includes(c.key)?selected.filter(x=>x!==c.key):[...selected,c.key];save(placement.scope==="session"?{...placement,modes:next as TagPlacement["modes"]}:{...placement,kinds:next as TagPlacement["kinds"]});}}>{c.label}</Button>)}</div><p className="text-xs text-muted-foreground">Bez ograničenja: prikazuje se svuda na izabranom mestu. Raniji izbori ostaju sačuvani.</p></div>;
}

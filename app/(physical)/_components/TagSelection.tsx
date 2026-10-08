"use client";
import { useState } from "react";
import type { ActivityTag,ActivityTagGroup } from "@/db/schema/physical";
import type { TagContext } from "@/lib/physical/types";
import { selectTag,visibleGroups } from "@/lib/physical/tagSelection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
type Props={groups:ActivityTagGroup[];tags:ActivityTag[];selectedIds:string[];context:TagContext;onChange:(ids:string[])=>void};
export function TagSelection({groups,tags,selectedIds,context,onChange}:Props){
 return <div className="grid gap-4 sm:grid-cols-2">{visibleGroups(groups,tags,selectedIds,context).map(group=><TagChoice key={group.id} group={group} tags={tags.filter(t=>t.groupId===group.id)} selected={selectedIds} choose={id=>onChange(selectTag(selectedIds,tags,group.id,id))}/>)}</div>;
}
function TagChoice({group,tags,selected,choose}:{group:ActivityTagGroup;tags:ActivityTag[];selected:string[];choose:(id:string|null)=>void}){
 const [search,setSearch]=useState("");
 const selectedId=tags.find(t=>selected.includes(t.id))?.id??"";
 const options=tags.filter(t=>t.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())||t.id===selectedId);
 return <fieldset className="min-w-0 space-y-2"><legend className="mb-2 text-sm font-medium">{group.name}</legend>{tags.length<=6?<div className="flex flex-wrap gap-2">{tags.map(tag=><Button key={tag.id} type="button" size="sm" variant={selected.includes(tag.id)?"secondary":"outline"} aria-pressed={selected.includes(tag.id)} onClick={()=>choose(selected.includes(tag.id)?null:tag.id)}>{tag.name}</Button>)}</div>:<div className="space-y-2"><Input aria-label={`Pretraži ${group.name}`} placeholder="Pretraži opcije…" value={search} onChange={e=>setSearch(e.target.value)}/><select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" aria-label={group.name} value={selectedId} onChange={e=>choose(e.target.value||null)}><option value="">Bez izbora</option>{options.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}{selectedId&&<button type="button" className="text-xs text-muted-foreground underline underline-offset-4" onClick={()=>choose(null)}>Ukloni izbor</button>}</fieldset>;
}

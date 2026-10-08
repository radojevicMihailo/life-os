"use client";
import type { ActivityTag, ActivityTagGroup } from "@/db/schema/physical";
import type { TagContext } from "@/lib/physical/types";
import { selectTag, selectTagWithDependencies, visibleGroups } from "@/lib/physical/tagSelection";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {groups:ActivityTagGroup[];tags:ActivityTag[];selectedIds:string[];context:TagContext;conditionIds?:string[];onChange:(ids:string[])=>void};
export function TagSelection({groups,tags,selectedIds,context,conditionIds=selectedIds,onChange}:Props){
 return <div className="grid gap-4 sm:grid-cols-2">{visibleGroups(groups,tags,selectedIds,context,conditionIds).map(group=><TagChoice key={group.id} group={group} tags={tags.filter(t=>t.groupId===group.id)} selected={selectedIds} choose={id=>onChange(context.scope==="session"?selectTagWithDependencies(selectedIds,tags,groups,group.id,id):selectTag(selectedIds,tags,group.id,id))}/>)}</div>;
}
function TagChoice({group,tags,selected,choose}:{group:ActivityTagGroup;tags:ActivityTag[];selected:string[];choose:(id:string|null)=>void}){
 const selectedId=tags.find(t=>selected.includes(t.id))?.id;
 return <fieldset className="min-w-0 space-y-2"><legend className="mb-2 text-sm font-medium">{group.name}</legend>{tags.length<=6?<div className="flex flex-wrap gap-2">{tags.map(tag=><Button key={tag.id} type="button" size="sm" variant={selected.includes(tag.id)?"secondary":"outline"} aria-pressed={selected.includes(tag.id)} onClick={()=>choose(selected.includes(tag.id)?null:tag.id)}>{tag.name}</Button>)}</div>:<Select value={selectedId??"none"} onValueChange={value=>choose(value==="none"?null:value)}><SelectTrigger aria-label={group.name} className="w-full"><SelectValue/></SelectTrigger><SelectContent position="popper"><SelectItem value="none">Bez izbora</SelectItem>{tags.map(tag=><SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}</SelectContent></Select>}{selectedId&&<button type="button" className="text-xs text-muted-foreground underline underline-offset-4" onClick={()=>choose(null)}>Ukloni izbor</button>}</fieldset>;
}

import type { GroupConfig,TagContext,TagRef } from "./types";
export function visibleGroups<T extends GroupConfig>(groups:T[],tags:TagRef[],selectedIds:string[],context:TagContext,conditionIds:string[]=selectedIds):T[]{
 const retained=new Set(tags.filter(t=>selectedIds.includes(t.id)).map(t=>t.groupId));
 const byId=new Map(groups.map(g=>[g.id,g]));
 function eligible(g:GroupConfig,seen=new Set<string>()):boolean{
  if(seen.has(g.id))return false;seen.add(g.id);
  const condition=g.placement?.when;if(!condition)return true;
  const parent=byId.get(condition.groupId);
  return !!parent&&condition.tagIds.some(id=>conditionIds.includes(id))&&eligible(parent,seen);
 }
 return groups.filter(g=>{if(!eligible(g))return false;if(retained.has(g.id))return true;const p=g.placement??{scope:"session",modes:[],kinds:[]};if(p.scope!==context.scope)return false;
 return context.scope==="session"?(!p.modes.length||p.modes.includes(context.mode)):(!p.kinds.length||p.kinds.includes(context.kind));});
}
export function tagConflicts(tagIds:string[],tags:TagRef[]):{groupId:string;tagIds:string[]}[]{
 const selected=new Set(tagIds),groups=new Map<string,string[]>();for(const t of tags)if(selected.has(t.id))groups.set(t.groupId,[...(groups.get(t.groupId)??[]),t.id]);
 return [...groups].filter(([,ids])=>ids.length>1).map(([groupId,tagIds])=>({groupId,tagIds}));
}
export function selectTag(ids:string[],tags:TagRef[],groupId:string,tagId:string|null):string[]{
 const groupIds=new Set(tags.filter(t=>t.groupId===groupId).map(t=>t.id));
 const kept=ids.filter(id=>!groupIds.has(id));return tagId?[...kept,tagId]:kept;
}

export function selectTagWithDependencies(ids:string[],tags:TagRef[],groups:GroupConfig[],groupId:string,tagId:string|null):string[]{
 let next=selectTag(ids,tags,groupId,tagId);
 const affected=new Set([groupId]),inactive=new Set<string>();
 let changed=true;
 while(changed){changed=false;for(const g of groups){
  const condition=g.placement?.when;
  if(!condition||inactive.has(g.id)||!affected.has(condition.groupId)||condition.tagIds.some(id=>next.includes(id)))continue;
  inactive.add(g.id);affected.add(g.id);changed=true;
  next=next.filter(id=>!tags.some(t=>t.id===id&&t.groupId===g.id));
 }}
 return next;
}
export function placementDependencyError(groupId:string,placement:import("./types").TagPlacement,groups:GroupConfig[],tags:TagRef[]):string|null{
 if(!groups.some(g=>g.id===groupId))return "Grupa više ne postoji.";
 const condition=placement.when;if(!condition)return null;
 if(!groups.some(g=>g.id===condition.groupId)||!condition.tagIds.length||condition.tagIds.some(id=>!tags.some(t=>t.id===id&&t.groupId===condition.groupId)))return "Proveri grupu i opcije uslova prikaza.";
 const visited=new Set([groupId]);let parent:string|undefined=condition.groupId;
 while(parent){if(visited.has(parent))return "Grupe ne mogu međusobno da uslovljavaju prikaz.";visited.add(parent);parent=groups.find(g=>g.id===parent)?.placement?.when?.groupId;}
 return null;
}

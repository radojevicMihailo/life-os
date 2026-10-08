import type { GroupConfig,TagContext,TagRef } from "./types";
export function visibleGroups<T extends GroupConfig>(groups:T[],tags:TagRef[],selectedIds:string[],context:TagContext):T[]{
 const retained=new Set(tags.filter(t=>selectedIds.includes(t.id)).map(t=>t.groupId));
 return groups.filter(g=>{if(retained.has(g.id))return true;const p=g.placement??{scope:"session",modes:[],kinds:[]};if(p.scope!==context.scope)return false;
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

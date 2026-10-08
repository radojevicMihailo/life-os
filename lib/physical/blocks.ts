import type { ActivityDraft, ActivityWrite, BlockDetails, BlockKind, EntryMode, StoredBlock, TrainingBlock } from "./types";
export function emptyDetails(): BlockDetails { return { version:1,label:null,note:null,status:"pending",targets:{},linkNext:false,restSec:null,optional:false }; }
export function newBlock(kind: BlockKind): TrainingBlock { return { rowKey:crypto.randomUUID(),kind,exerciseId:null,values:{},details:emptyDetails(),tagIds:[],sortOrder:0 }; }
export function adaptStoredBlock(row: StoredBlock): TrainingBlock { return { ...structuredClone(row),rowKey:crypto.randomUUID(),tagIds:[...(row.tagIds??[])],details:row.details?structuredClone(row.details):{...emptyDetails(),status:"done"} }; }
function normalize(rows: TrainingBlock[], original: TrainingBlock[]): TrainingBlock[] {
 const links=new Set(original.flatMap((b,i)=>b.details.linkNext&&original[i+1]?[b.rowKey+":"+original[i+1].rowKey]:[]));
 return rows.map((b,i)=>({...b,sortOrder:i,details:{...b.details,linkNext:b.kind==="exercise"&&rows[i+1]?.kind==="exercise"&&links.has(b.rowKey+":"+rows[i+1].rowKey)}}));
}
export function moveBlock(rows: TrainingBlock[], index:number,direction:-1|1):TrainingBlock[]{
 const dest=index+direction;if(index<0||dest<0||index>=rows.length||dest>=rows.length)return rows;
 const next=[...rows];[next[index],next[dest]]=[next[dest],next[index]];return normalize(next,rows);
}
export function removeBlock(rows:TrainingBlock[],index:number):TrainingBlock[]{return normalize(rows.filter((_,i)=>i!==index),rows);}
export function duplicateBlock(rows:TrainingBlock[],index:number):TrainingBlock[]{
 if(!rows[index])return rows;const copy={...structuredClone(rows[index]),id:undefined,rowKey:crypto.randomUUID()};
 const next=[...rows.slice(0,index+1),copy,...rows.slice(index+1)];return normalize(next,rows);
}
export function inferEntryMode(rows:TrainingBlock[],fallback:EntryMode):EntryMode{
 const run=rows.some(b=>b.kind!=="exercise"),gym=rows.some(b=>b.kind==="exercise");return run&&gym?"mixed":run?"running":gym?"gym":fallback;
}
export function toActivityWrite(draft:ActivityDraft):ActivityWrite{
 const {blocks,id,...parent}=draft;void id;
 const nonempty=blocks.filter(b=>b.id||b.exerciseId||b.tagIds.length||b.details.label||b.details.note||Object.keys(b.details.targets).length||Object.values(b.values).some(v=>v!=null&&v!==""&&(!Array.isArray(v)||v.length)));
 return {...parent,tagIds:[...new Set(parent.tagIds)],subrows:nonempty.map((b,sortOrder)=>{const {rowKey,...stored}=b;void rowKey;return {...structuredClone(stored),sortOrder};})};
}

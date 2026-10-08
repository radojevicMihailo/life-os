import {z} from "zod";
/** Recent picker stays bounded; a direct repeat link can address any existing activity. */
export async function includeRequestedActivity<T extends {id:string}>(recent:T[],source:string|undefined,load:(id:string)=>Promise<T|null>):Promise<T[]>{
 if(!source?.startsWith("activity:"))return recent;
 const parsed=z.uuid().safeParse(source.slice("activity:".length));
 if(!parsed.success||recent.some(a=>a.id===parsed.data))return recent;
 const requested=await load(parsed.data);
 return requested?[...recent,requested]:recent;
}

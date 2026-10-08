"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activity } from "@/db/schema/physical";
import { saveActivity } from "@/lib/physical/repository";
import { authorizePhysicalAction,physicalActionError } from "@/lib/physical/actionAccess";
import { revalidatePhysicalRoutes } from "./_revalidate";
function normalize(raw:unknown):unknown{
 if(raw&&typeof raw==="object"&&"performedAt" in raw){const obj=raw as Record<string,unknown>;return {...obj,performedAt:typeof obj.performedAt==="string"?new Date(obj.performedAt):obj.performedAt};}return raw;
}
export async function createActivity(raw:unknown){
 try{await authorizePhysicalAction();const id=await saveActivity(db,normalize(raw));revalidatePhysicalRoutes({activityId:id});return {ok:true as const,data:{id}};}catch(error){return physicalActionError(error);}
}
export async function updateActivity(activityId:string,raw:unknown){
 try{await authorizePhysicalAction();await saveActivity(db,normalize(raw),activityId);revalidatePhysicalRoutes({activityId});return {ok:true as const,data:undefined};}catch(error){return physicalActionError(error);}
}
export async function deleteActivity(activityId:string){
 try{await authorizePhysicalAction();await db.delete(activity).where(eq(activity.id,activityId));revalidatePhysicalRoutes({activityId});return {ok:true as const,data:undefined};}catch(error){return physicalActionError(error);}
}

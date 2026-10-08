"use server";
import { eq,sql } from "drizzle-orm";
import { db } from "@/db";
import { workoutPlan } from "@/db/schema/physical";
import { saveWorkoutPlan } from "@/lib/physical/repository";
import { authorizePhysicalAction,physicalActionError } from "@/lib/physical/actionAccess";
import { revalidatePhysicalRoutes } from "./_revalidate";
export async function createWorkoutPlan(raw:unknown){
 try{await authorizePhysicalAction();const id=await saveWorkoutPlan(db,raw);revalidatePhysicalRoutes({workoutPlanId:id});return {ok:true as const,data:{id}};}catch(error){return physicalActionError(error);}
}
export async function updateWorkoutPlan(planId:string,raw:unknown){
 try{await authorizePhysicalAction();await saveWorkoutPlan(db,raw,planId);revalidatePhysicalRoutes({workoutPlanId:planId});return {ok:true as const,data:undefined};}catch(error){return physicalActionError(error);}
}
export async function archiveWorkoutPlan(planId:string){
 try{await authorizePhysicalAction();await db.update(workoutPlan).set({archivedAt:sql`now()`,updatedAt:sql`now()`}).where(eq(workoutPlan.id,planId));revalidatePhysicalRoutes({workoutPlanId:planId});return {ok:true as const,data:undefined};}catch(error){return physicalActionError(error);}
}
export async function deleteWorkoutPlan(planId:string){
 try{await authorizePhysicalAction();await db.delete(workoutPlan).where(eq(workoutPlan.id,planId));revalidatePhysicalRoutes({workoutPlanId:planId});return {ok:true as const,data:undefined};}catch(error){return physicalActionError(error);}
}

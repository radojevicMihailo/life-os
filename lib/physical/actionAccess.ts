import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME,configuredAccessPassword,verifyAccessSession } from "@/lib/access";
import { TrainingInputError } from "./repository";
export async function authorizePhysicalAction():Promise<void>{
 const password=configuredAccessPassword();
 if(!password||!verifyAccessSession((await cookies()).get(ACCESS_COOKIE_NAME)?.value,password))throw new TrainingInputError("Prijavi se ponovo da sačuvaš trening.");
}
export function physicalActionError(error:unknown){
 return error instanceof TrainingInputError?{ok:false as const,error:error.message,fieldErrors:error.fieldErrors}:{ok:false as const,error:"Čuvanje nije uspelo. Podaci su ostali u formi; pokušaj ponovo.",fieldErrors:{}};
}

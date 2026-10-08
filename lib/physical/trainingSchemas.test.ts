import {expect,it} from "vitest";
import {trainingBlockSchema,planBlocksSchema} from "./trainingSchemas";
import {newBlock} from "./blocks";
it("requires actual results for done blocks but allows open plan goals",()=>{
 const b=newBlock("split");b.details.status="done";
 expect(trainingBlockSchema.safeParse(b).success).toBe(false);
 b.values={duration:420};expect(trainingBlockSchema.safeParse(b).success).toBe(true);
 const exercise=newBlock("exercise");exercise.details.label="Eksplozivni push";
 const {status,...details}=exercise.details;void status;
 expect(planBlocksSchema.safeParse({version:1,items:[{...exercise,details}]}).success).toBe(true);
});
it("accepts sprints measured in seconds and rejects negative or incomplete repetitions",()=>{
 const b=newBlock("sprint");b.details.status="done";
 b.values={sprintDuration:10,sprintReps:4,sprintRest:120};expect(trainingBlockSchema.safeParse(b).success).toBe(true);
 b.values.sprintReps=0;expect(trainingBlockSchema.safeParse(b).success).toBe(false);
 b.details.status="pending";b.values={sprintDistance:-1};expect(trainingBlockSchema.safeParse(b).success).toBe(false);
});
it("rejects inverted target ranges and performed metrics in templates",()=>{
 const b=newBlock("split"),{status,...details}=b.details;void status;
 expect(planBlocksSchema.safeParse({version:1,items:[{...b,details:{...details,targets:{distanceKm:{min:8,max:4}}}}]}).success).toBe(false);
 expect(planBlocksSchema.safeParse({version:1,items:[{...b,details,values:{distance:8}}]}).success).toBe(false);
});

import {expect,it} from "vitest";
import {newBlock} from "./blocks";
import {describeBlock} from "./display";
it("describes sprint time and unweighted jumps without fabricated distance or weight",()=>{
 const sprint=newBlock("sprint");sprint.values={sprintReps:4,sprintDuration:10,sprintRest:120};
 expect(describeBlock(sprint)).toBe("4 × 10 s · pauza 120 s");
 const jump=newBlock("exercise");jump.values={sets:[{reps:3},{reps:3}]};expect(describeBlock(jump)).toBe("3 pon. · 3 pon.");
});
it("shows recorded legacy pace when it cannot be recomputed",()=>{
 const run=newBlock("split");run.values={pace:300};expect(describeBlock(run)).toBe("Zabeleženi tempo 5:00 /km");
});

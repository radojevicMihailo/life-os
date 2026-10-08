import {afterAll,beforeAll,expect,it} from "vitest";
import {eq,sql} from "drizzle-orm";
import {activity,activitySubrow,activitySubrowTag,activityTag,activityTagGroup,exercise,workoutPlan} from "@/db/schema/physical";
import {newBlock,toActivityWrite} from "@/lib/physical/blocks";
import {planFromActivity} from "@/lib/physical/drafts";
import {saveActivity,saveWorkoutPlan,removeExercise,loadActivity,loadActivities} from "@/lib/physical/repository";
import type {ActivityDraft} from "@/lib/physical/types";
import {createPhysicalDatabase,type PhysicalTestDatabase} from "../support/database";
let database:PhysicalTestDatabase;
beforeAll(async()=>{database=await createPhysicalDatabase();},120000);
afterAll(async()=>{await database?.close();},30000);
const draft=():ActivityDraft=>{const b=newBlock("split");b.details.status="done";b.values={distance:5,duration:1500,customKey:"keep"};return {title:"Tempo",performedAt:new Date("2026-10-08T10:00:00Z"),values:{customTop:9},comment:null,stravaUrl:null,tagIds:[],blocks:[b]};};
it("preserves unknown values and block tags through update and filtering",async()=>{
 const [group]=await database.db.insert(activityTagGroup).values({name:"Vrsta trčanja"}).returning();
 const [tag]=await database.db.insert(activityTag).values({groupId:group.id,name:"Tempo"}).returning();
 const d=draft();d.blocks[0].tagIds=[tag.id];d.tagIds=[tag.id];
 const id=await saveActivity(database.db,toActivityWrite(d));await saveActivity(database.db,toActivityWrite(d),id);
 const detail=await loadActivity(database.db,id);expect(detail?.subrows[0].values.customKey).toBe("keep");expect(detail?.activity.values.customTop).toBe(9);expect(detail?.subrows[0].tagIds).toEqual([tag.id]);
 const filtered=await loadActivities(database.db,{tagId:tag.id});expect(filtered.filter(x=>x.id===id)).toHaveLength(1);expect(filtered.find(x=>x.id===id)?.summary.distanceKm).toBe(5);
 await database.db.delete(activityTag).where(eq(activityTag.id,tag.id));expect(await database.db.select().from(activitySubrowTag)).toHaveLength(0);
});
it("rolls back parent, blocks and tags when child insertion fails",async()=>{
 const d=draft(),id=await saveActivity(database.db,toActivityWrite(d));
 await database.pool.query(`CREATE FUNCTION reject_test_block() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.details->>'note'='reject-test' THEN RAISE EXCEPTION 'test rejection'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_test_block BEFORE INSERT ON physical_activity_subrows FOR EACH ROW EXECUTE FUNCTION reject_test_block()`);
 d.title="Changed";d.blocks[0].details.note="reject-test";
 try{await expect(saveActivity(database.db,toActivityWrite(d),id)).rejects.toThrow();}finally{await database.pool.query('DROP TRIGGER reject_test_block ON physical_activity_subrows; DROP FUNCTION reject_test_block()');}
 const detail=await loadActivity(database.db,id);expect(detail?.activity.title).toBe("Tempo");expect(detail?.subrows[0].details?.note).toBeNull();
});
it("rejects missing references and blocks deletion of a template exercise",async()=>{
 const d=draft();d.blocks[0].tagIds=[crypto.randomUUID()];await expect(saveActivity(database.db,toActivityWrite(d))).rejects.toThrow();
 const [ex]=await database.db.insert(exercise).values({name:"Bench"}).returning();
 const b=newBlock("exercise");b.exerciseId=ex.id;const plan=planFromActivity({...draft(),blocks:[b]},false);
 const planId=await saveWorkoutPlan(database.db,{name:"Upper",notes:null,blocks:plan});
 await expect(removeExercise(database.db,ex.id)).rejects.toThrow();
 await database.db.update(exercise).set({archivedAt:sql`now()`}).where(eq(exercise.id,ex.id));
 expect((await database.db.select().from(workoutPlan).where(eq(workoutPlan.id,planId)))[0].blocks?.items[0].exerciseId).toBe(ex.id);
});
it("round-trips legacy incomplete results but rejects a changed invalid result or foreign original ID",async()=>{
 const [old]=await database.db.insert(activity).values({performedAt:new Date(),values:{extra:1}}).returning();
 const [row]=await database.db.insert(activitySubrow).values({activityId:old.id,kind:"split",values:{distance:0,pace:300,extra:"keep"},sortOrder:0}).returning();
 const d=draft();d.blocks[0].id=row.id;d.blocks[0].values={distance:0,pace:300,extra:"keep"};
 await saveActivity(database.db,toActivityWrite(d),old.id);
 expect((await loadActivity(database.db,old.id))?.subrows[0].values.extra).toBe("keep");
 const current=await loadActivity(database.db,old.id);d.blocks[0].id=current!.subrows[0].id;d.blocks[0].values.distance=-1;
 await expect(saveActivity(database.db,toActivityWrite(d),old.id)).rejects.toThrow();
 d.blocks[0].values.distance=0;await expect(saveActivity(database.db,toActivityWrite(d))).rejects.toThrow();
});
it("classifies a pending gym workout from its structure rather than completed results",async()=>{
 const d=draft(),b=newBlock("exercise");b.details.label="Eksplozivni push";d.blocks=[b];d.title=null;
 const id=await saveActivity(database.db,toActivityWrite(d)),row=(await loadActivities(database.db)).find(a=>a.id===id);
 expect(row).toMatchObject({mode:"gym",summary:{exerciseCount:0,distanceKm:0}});
});

import {afterAll,beforeAll,expect,it} from "vitest";
import {readFile} from "node:fs/promises";
import {createPhysicalDatabase,type PhysicalTestDatabase} from "../support/database";
let database:PhysicalTestDatabase;
beforeAll(async()=>{database=await createPhysicalDatabase();},120000);
afterAll(async()=>{await database?.close();},30000);
it("provides Kardio as a workout purpose on a fresh database",async()=>{
 const result=await database.pool.query(`SELECT t.name FROM activity_tags t JOIN activity_tag_groups g ON g.id=t.group_id WHERE g.name='Namera'`);
 expect(result.rows.map(r=>r.name)).toContain("Kardio");
});
it.each(["Namera","Namena","Intent"])("extends %s without replacing existing options or duplicating Kardio on retry",async name=>{
 const migration=await readFile(new URL("../../../db/unified-migrations/0014_cardio_purpose.sql",import.meta.url),"utf8");
 const client=await database.pool.connect();
 try{
  await client.query("BEGIN");
  await client.query(`DELETE FROM activity_tag_groups WHERE lower(name) IN ('namera','namena','intent')`);
  const group=await client.query(`INSERT INTO activity_tag_groups(name,placement) VALUES ($1,'{"scope":"session","modes":["running","gym","mixed"],"kinds":[]}'::jsonb) RETURNING id`,[name]);
  const id=group.rows[0].id;
  const original=await client.query(`INSERT INTO activity_tags(group_id,name,sort_order) VALUES ($1,'Snaga',3) RETURNING id`,[id]);
  await client.query("SAVEPOINT before_cardio");
  await client.query(migration);await client.query(migration);
  const options=await client.query(`SELECT id,name,sort_order FROM activity_tags WHERE group_id=$1 ORDER BY sort_order`,[id]);
  expect(options.rows).toEqual([{id:original.rows[0].id,name:"Snaga",sort_order:3},{id:expect.any(String),name:"Kardio",sort_order:4}]);
  const placed=await client.query(`SELECT placement FROM activity_tag_groups WHERE id=$1`,[id]);
  expect(placed.rows[0].placement).toEqual({scope:"session",modes:["running","gym","mixed","cardio"],kinds:[]});
  await client.query("ROLLBACK TO SAVEPOINT before_cardio");
  expect((await client.query(`SELECT name FROM activity_tags WHERE group_id=$1`,[id])).rows).toEqual([{name:"Snaga"}]);
 }finally{await client.query("ROLLBACK");client.release();}
});

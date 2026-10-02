import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { TASK_PRIORITIES } from "@/lib/task-priorities";
import { createTestDatabase, TEST_DATABASE_HOOK_TIMEOUT_MS, TEST_DATABASE_TEARDOWN_TIMEOUT_MS, type TestDatabase } from "../support/database";
let database: TestDatabase;
beforeAll(async () => { database = await createTestDatabase(); }, TEST_DATABASE_HOOK_TIMEOUT_MS);
afterAll(async () => { await database?.close(); }, TEST_DATABASE_TEARDOWN_TIMEOUT_MS);
it("maps legacy task links to four quadrants and keeps original records for recovery", async () => {
  await database.pool.query(`
    CREATE TABLE priorities(id uuid PRIMARY KEY, name text UNIQUE NOT NULL, color text, rank integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE tasks(id uuid PRIMARY KEY, priority_id uuid REFERENCES priorities(id) ON DELETE SET NULL);
    INSERT INTO priorities(id,name,rank) VALUES
      ('12345678-1234-4234-8234-000000000001','Urgent',10),
      ('12345678-1234-4234-8234-000000000002','Q2 - old label',100),
      ('12345678-1234-4234-8234-000000000003','Later',200),
      ('12345678-1234-4234-8234-000000000004','Optional',300),
      ('12345678-1234-4234-8234-000000000005','Extra',400);
    INSERT INTO tasks(id,priority_id) SELECT id,id FROM priorities;
  `);
  await database.pool.query(await readFile("db/unified-migrations/0005_fixed_task_priorities.sql", "utf8"));
  const priorities = (await database.pool.query("select id,name,rank from priorities order by rank")).rows;
  expect(priorities).toEqual(TASK_PRIORITIES.map(({id,name,rank}) => ({id,name,rank})));
  const links = (await database.pool.query("select priority_id from tasks order by id")).rows.map((row) => row.priority_id);
  expect(links).toEqual([TASK_PRIORITIES[0].id,TASK_PRIORITIES[1].id,TASK_PRIORITIES[2].id,TASK_PRIORITIES[3].id,TASK_PRIORITIES[3].id]);
  expect((await database.pool.query("select count(*) from priorities_legacy_backup")).rows[0].count).toBe("5");
  expect((await database.pool.query("select count(*) from task_priorities_legacy_backup")).rows[0].count).toBe("5");
  await expect(database.pool.query("update priorities set name='Custom' where rank=1")).rejects.toMatchObject({code:"23514"});
  await expect(database.pool.query("insert into priorities(id,name,rank) values(gen_random_uuid(),'Q5',5)")).rejects.toMatchObject({code:"23514"});
});

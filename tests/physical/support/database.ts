import { GenericContainer } from "testcontainers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema/physical";
import { migrate } from "@/scripts/migrate.mjs";
export async function createPhysicalDatabase() {
 const container=await new GenericContainer("postgres:16-alpine").withEnvironment({POSTGRES_DB:"physical_test",POSTGRES_USER:"postgres",POSTGRES_PASSWORD:"postgres"}).withExposedPorts(5432).start();
 const connectionString=`postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(5432)}/physical_test`;
 const pool=new Pool({connectionString,max:4,connectionTimeoutMillis:5000});
 try { await migrate(pool); } catch(error){await pool.end();await container.stop();throw error;}
 return {pool,connectionString,db:drizzle(pool,{schema}),async close(){await pool.end();await container.stop();}};
}
export type PhysicalTestDatabase=Awaited<ReturnType<typeof createPhysicalDatabase>>;

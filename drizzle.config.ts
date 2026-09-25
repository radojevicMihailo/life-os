import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./db/schema/*.ts", "./modules/finance/db/schema/*.ts"],
  out: "./db/schema-migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/lifeos",
  },
  strict: true,
  verbose: true,
});

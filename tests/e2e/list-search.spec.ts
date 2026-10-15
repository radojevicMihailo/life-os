import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const connectionString = process.env.LIFE_OS_E2E_DATABASE_URL;
test.skip(!connectionString, "Requires an explicitly supplied disposable test database");
test.use({ baseURL: process.env.LIFE_OS_E2E_URL ?? "http://127.0.0.1:3217", channel: process.env.LIFE_OS_E2E_CHANNEL || undefined });
const prefix = `Pregled-${Date.now()}`;
let pool: Pool;
test.beforeAll(async () => {
  const url = new URL(connectionString!);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/life_os_improvements") throw new Error("Disposable test database required");
  pool = new Pool({ connectionString, max: 1 });
  for (let index = 0; index < 55; index++) await pool.query("insert into tasks(title) values ($1)", [`${prefix} ${String(index).padStart(2, "0")}`]);
  await pool.query("insert into tasks(title) values ($1), ($2)", [`${prefix} doslovno %_`, `${prefix} doslovno AB`]);
  await pool.query("insert into notes(title, body) values ($1,$2)", [`${prefix} duga beleška`, "Uvod ".repeat(300) + `${prefix}-skriveni-pojam`]);
});
test.afterAll(async () => {
  if (!pool) return;
  await pool.query("delete from tasks where title like $1", [`${prefix}%`]);
  await pool.query("delete from notes where title like $1", [`${prefix}%`]);
  await pool.end();
});
test.beforeEach(async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-improvements-test-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL(/\/$/);
});
test("task pages stay bounded and preserve search on subsequent pages", async ({ page }) => {
  await page.goto(`/tasks?q=${encodeURIComponent(prefix)}&view=flat&sort=title`);
  await expect(page.locator('main a[href^="/tasks/"]')).toHaveCount(50);
  await page.getByRole("link", { name: "Učitaj još" }).click();
  await expect(page.locator('main a[href^="/tasks/"]')).toHaveCount(7);
  await expect(page).toHaveURL(new RegExp(`q=${prefix}`));
  await page.getByRole("link", { name: "Prethodno" }).click();
  await expect(page.locator('main a[href^="/tasks/"]')).toHaveCount(50);
});
test("task search treats SQL wildcard characters literally", async ({ page }) => {
  await page.goto(`/tasks?q=${encodeURIComponent(`${prefix} doslovno %_`)}`);
  await expect(page.getByRole("link", { name: `${prefix} doslovno %_`, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: `${prefix} doslovno AB`, exact: true })).toHaveCount(0);
});
test("notes search reaches beyond previews without downloading full bodies", async ({ page }) => {
  await page.goto(`/notes?q=${prefix}-skriveni-pojam`);
  await expect(page.getByRole("link", { name: new RegExp(`${prefix} duga beleška`) })).toBeVisible();
  expect(await page.content()).not.toContain("Uvod ".repeat(100));
});

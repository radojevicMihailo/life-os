import { expect, test } from "@playwright/test";

test.use({
  baseURL: process.env.LIFE_OS_E2E_URL ?? "http://localhost:3210",
  channel: process.env.LIFE_OS_E2E_CHANNEL || undefined,
});
test.beforeEach(async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
});

test("tasks open calendar; priorities and notification settings share their new destinations", async ({ page }) => {
  await page.goto("/task-manager");
  await expect(page).toHaveURL("/calendar");
  await page.goto("/priorities");
  await expect(page).toHaveURL("/context");
  await expect(page.getByRole("heading", { name: "Konteksti i prioriteti" })).toBeVisible();
  for (const name of ["Q1 - hitno i bitno", "Q2 - nije hitno, jeste bitno", "Q3 - jeste hitno, nije bitno", "Q4 - nije hitno, nije bitno"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /add priority|new priority/i })).toHaveCount(0);
  await page.goto("/notifications");
  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { name: "Notifikacije", exact: true })).toBeVisible();
});

test("task date picker supports calendar selection, time, and narrow screens inside the form", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tasks");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").filter({ hasText: "Izaberite datum" }).first().click();
  await page.getByRole("button", { name: "Danas", exact: true }).click();
  await expect(dialog.getByRole("combobox").first()).not.toContainText("Izaberite datum");
  await dialog.getByRole("button", { name: "Dodaj vreme", exact: true }).first().click();
  await expect(dialog.getByRole("button", { name: "Ukloni vreme", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("combobox").first().click();
  await expect(page.getByLabel("Sati", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Minuti", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});


test("task priorities use short quadrant labels and keep Q2 green", async ({ page }) => {
  await page.goto("/tasks");
  for (const label of ["Q1", "Q2", "Q3", "Q4"]) {
    await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText(/^Q[1-4] - /)).toHaveCount(0);
  await page.getByRole("link", { name: "Q2", exact: true }).first().click();
  const badge = page.getByRole("link", { name: "Q2", exact: true }).first().locator("[data-slot=badge]");
  await expect(badge).toHaveCSS("background-color", "rgb(34, 197, 94)");
});


test("account currency selector offers native BTC and ETH wallets", async ({ page }) => {
  await page.goto("/finance/accounts");
  const currency = page.locator('select[name="currencyCode"]').first();
  await expect(currency).toHaveValue("EUR");
  for (const code of ["BTC", "ETH"]) {
    await currency.selectOption(code);
    await expect(currency).toHaveValue(code);
  }
});

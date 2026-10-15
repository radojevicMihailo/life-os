import { expect, test } from "@playwright/test";

test.use({ baseURL: process.env.LIFE_OS_E2E_URL ?? "http://127.0.0.1:3217", channel: process.env.LIFE_OS_E2E_CHANNEL || undefined });
test.beforeEach(async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-improvements-test-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page.getByRole("heading", { name: "Danas", exact: true })).toBeVisible();
});

test("global search opens with keyboard and creates a task through the existing form", async ({ page }) => {
  const title = `Provera pretrage ${Date.now()}`;
  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("dialog");
  await expect(search.getByRole("textbox", { name: "Pretraži aplikaciju" })).toBeFocused();
  await search.getByRole("link", { name: "Novi zadatak", exact: true }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Naslov", { exact: true }).fill(title);
  await form.getByRole("button", { name: "Dodaj", exact: true }).click();
  await expect(form).toBeHidden();
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("textbox", { name: "Pretraži aplikaciju" }).fill(title);
  await expect(page.getByRole("dialog").getByRole("link", { name: new RegExp(title) })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("free note body autosaves before sidebar navigation", async ({ page }) => {
  await page.goto("/notes?new=1");
  await page.getByRole("dialog").getByRole("button", { name: "Slobodna beleška" }).click();
  const title = `Sačuvana beleška ${Date.now()}`;
  await page.getByLabel("Naslov", { exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Sadržaj beleške u Markdown formatu" }).fill("Tekst koji mora ostati sačuvan posle navigacije.");
  const url = page.url();
  await page.getByRole("navigation", { name: "Glavna navigacija" }).getByRole("link", { name: "Danas", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto(url);
  await expect(page.getByLabel("Naslov", { exact: true })).toHaveValue(title);
  await expect(page.getByText("Tekst koji mora ostati sačuvan posle navigacije.", { exact: true })).toBeVisible();
});

test("mobile navigation and appearance preferences remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole("navigation", { name: "Brza navigacija" });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "Više" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Kompaktan prikaz", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect(page.getByRole("button", { name: "Kompaktan prikaz", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.goto("/activities/new");
  const save = page.getByRole("button", { name: "Sačuvaj aktivnost", exact: true });
  await save.scrollIntoViewIfNeeded();
  const saveBox = await save.boundingBox();
  const navBox = await page.getByRole("navigation", { name: "Brza navigacija" }).boundingBox();
  expect(saveBox && navBox && saveBox.y + saveBox.height <= navBox.y).toBe(true);
});

test("investment setup is collapsed below the portfolio and preserves unsaved input", async ({ page }) => {
  await page.goto("/finance/investments");
  await page.getByRole("button", { name: "Prikaži iznose", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Naziv investicionog računa" });
  await expect(field).toBeHidden();
  await page.getByRole("region", { name: "Unos investicija", exact: true }).getByText("Dodaj investicioni račun", { exact: true }).click();
  await field.fill("Nesačuvan probni račun");
  await page.getByRole("region", { name: "Unos investicija", exact: true }).getByText("Dodaj investicioni račun", { exact: true }).click();
  await expect(field).toBeHidden();
  await page.getByRole("region", { name: "Unos investicija", exact: true }).getByText("Dodaj investicioni račun", { exact: true }).click();
  await expect(field).toHaveValue("Nesačuvan probni račun");
});

test("quick meal creation reopens when already on the meals page", async ({ page }) => {
  await page.goto("/meals");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("dialog").getByRole("link", { name: "Novi obrok", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Dodaj obrok", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Zatvori", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/meals$/);
  }
});

test("command navigation waits for a note save and closes its dialog", async ({ page }) => {
  await page.goto("/notes?new=1");
  await page.getByRole("dialog").getByRole("button", { name: "Slobodna beleška" }).click();
  await page.getByLabel("Naslov", { exact: true }).fill(`Brza navigacija ${Date.now()}`);
  await page.getByRole("textbox", { name: "Sadržaj beleške u Markdown formatu" }).fill("Sačuvaj pre pretrage.");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("dialog").getByRole("link", { name: /^Finansije/ }).click();
  await expect(page).toHaveURL(/\/finance$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});

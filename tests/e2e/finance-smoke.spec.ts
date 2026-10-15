import { expect, test } from "@playwright/test";

const baseURL = process.env.LIFE_OS_E2E_URL ?? "http://127.0.0.1:3210";
const password = process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026";

test.use({
  baseURL,
  browserName: "chromium",
  channel: process.env.LIFE_OS_E2E_CHANNEL || undefined,
  viewport: { width: 390, height: 844 },
});

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/finance/accounts");
  await expect(page).toHaveURL(/\/access$/);
  await page.getByLabel("Lozinka").fill(password);
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
}

test("creates an account, category and expenses with hidden amounts on mobile and desktop", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await signIn(page);
  await page.goto("/finance/accounts");
  await page.getByRole("button", { name: "Prikaži iznose" }).click();
  const accountForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "Novi račun", exact: true }) });
  await accountForm.getByLabel("Naziv računa", { exact: true }).fill("Browser proba EUR");
  await accountForm.getByLabel("Podvrsta računa", { exact: true }).fill("cash");
  await accountForm.getByRole("combobox", { name: "Valuta računa", exact: true }).selectOption("EUR");
  await accountForm.getByRole("button", { name: "Kreiraj račun" }).click();
  await expect(page.getByRole("heading", { name: "Browser proba EUR" })).toBeVisible();

  await page.goto("/finance/settings");
  await page.getByRole("button", { name: "Prikaži iznose" }).click();
  await page.getByLabel("Naziv kategorije").fill("Browser proba hrana");
  await page.getByRole("button", { name: "Kreiraj kategoriju" }).click();
  await expect(page.locator("li").filter({ hasText: "Browser proba hrana" })).toBeVisible();

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/finance");
    await expect(page.getByRole("button", { name: "Prikaži iznose" })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Finansije", exact: true });
    for (const name of ["Transakcije", "Planiranje", "Investicije", "Podešavanja"])
      await expect(navigation.getByRole("link", { name, exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Nova transakcija", exact: true }).click();
    const entry = page.locator("#new-transaction");
    await expect(entry.getByRole("button", { name: "Sačuvaj transakciju" })).toBeVisible();
    await entry.getByLabel("Operacija").selectOption("expense");
    await entry.getByRole("combobox", { name: "Račun", exact: true }).selectOption({ label: "Browser proba EUR" });
    await entry.getByRole("combobox", { name: "Kategorija", exact: true }).selectOption({ label: "Browser proba hrana" });
    await entry.getByLabel("Iznos", { exact: true }).fill("12,50");
    await entry.getByLabel("Opis", { exact: true }).fill(`Browser proba ručak ${width}`);
    await entry.getByRole("button", { name: "Sačuvaj transakciju" }).click();
    await expect(entry.getByText("Transakcija je sačuvana.", { exact: true })).toBeVisible();
    const table = page.getByRole("table", { name: "Transakcije", exact: true });
    await expect(table).toBeVisible();
    await expect(table.getByText(`Browser proba ručak ${width}`, { exact: true })).toHaveCount(1);
    await expect(table.locator('[aria-label="Finansijski podatak sakriven"]').first()).toBeVisible();
    await expect(table.getByRole("button", { name: "Obriši transakciju" }).first()).toBeHidden();
    await expect(page.getByRole("button", { name: "Primeni filtere" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prikaži iznose" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "Prikaži iznose" }).click();
    const row = table.getByRole("row").filter({ hasText: `Browser proba ručak ${width}` });
    await expect(row.getByLabel(/Iznos za Browser proba EUR: -12\.5(?:0)? EUR/)).toBeVisible();
    await expect(row.getByRole("button", { name: "Obriši transakciju" })).toBeVisible();
    await page.getByRole("button", { name: "Sakrij iznose" }).click();
    await expect(entry.getByRole("button", { name: "Sačuvaj transakciju" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Obriši transakciju" })).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath(`finance-${width}.png`), fullPage: true });
  }

  const exportResponse = await page.request.post("/finance/settings/exports/json", {
    headers: { origin: baseURL },
  });
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-disposition"]).toContain("attachment");
  expect(JSON.stringify(await exportResponse.json())).toContain("Browser proba ručak 390");
  expect(pageErrors).toEqual([]);
});

test("finance pages fit common phone widths", async ({ page }) => {
  await signIn(page);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/finance", "/finance/accounts", "/finance/transactions"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const documentWidth = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(documentWidth.scroll, `${path} at ${width}px`).toBeLessThanOrEqual(documentWidth.client);
    }
  }
});

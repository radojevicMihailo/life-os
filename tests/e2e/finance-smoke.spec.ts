import { expect, test } from "@playwright/test";

const baseURL = process.env.LIFE_OS_E2E_URL ?? "http://127.0.0.1:3210";

test.use({
  baseURL,
  browserName: "chromium",
  channel: process.env.LIFE_OS_E2E_CHANNEL || undefined,
  viewport: { width: 390, height: 844 },
});

test("creates an account, category and expense in the deployed image", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/finance/accounts");
  await page.getByLabel("Naziv računa").fill("Browser proba EUR");
  await page.getByLabel("Podvrsta računa").fill("cash");
  await page.getByLabel("Valuta računa").selectOption("EUR");
  await page.getByRole("button", { name: "Kreiraj račun" }).click();
  await expect(page.getByRole("heading", { name: "Browser proba EUR" })).toBeVisible();

  await page.goto("/finance/settings");
  await page.getByLabel("Naziv kategorije").fill("Browser proba hrana");
  await page.getByRole("button", { name: "Kreiraj kategoriju" }).click();
  await expect(page.locator("li").filter({ hasText: "Browser proba hrana" })).toBeVisible();

  await page.goto("/finance/transactions");
  await page.getByLabel("Operacija").selectOption("expense");
  await page.locator('select[name="accountId"]').selectOption({ label: "Browser proba EUR" });
  await page.getByLabel("Kategorija").selectOption({ label: "Browser proba hrana" });
  await page.getByLabel("Iznos", { exact: true }).fill("12.50");
  await page.getByLabel("Opis", { exact: true }).fill("Browser proba ručak");
  await page.getByRole("button", { name: "Sačuvaj transakciju" }).click();
  await expect(page.getByText("Browser proba ručak", { exact: true }).first()).toBeVisible();

  const exportResponse = await page.request.post("/finance/settings/exports/json", {
    headers: { origin: baseURL },
  });
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-disposition"]).toContain("attachment");
  expect(JSON.stringify(await exportResponse.json())).toContain("Browser proba ručak");
  expect(pageErrors).toEqual([]);
});

test("finance pages fit common phone widths", async ({ page }) => {
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

import { expect, test } from "@playwright/test";

test.use({
  baseURL: process.env.LIFE_OS_E2E_URL ?? "http://localhost:3210",
  channel: process.env.LIFE_OS_E2E_CHANNEL || undefined,
  viewport: { width: 390, height: 844 },
});

test("shopping list supports quick entry, automatic saving, unchecking and clearing purchases", async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/notes");
  await page.getByRole("button", { name: "Nova lista za kupovinu" }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  const title = page.getByLabel("Naslov", { exact: true });
  await expect(title).toHaveValue(/^Kupovina/);
  const product = page.getByRole("textbox", { name: "Dodaj proizvod" });
  await expect(product).toBeFocused();
  for (const text of ["Mleko", "Hleb", "Jaja"]) {
    await product.fill(text);
    await product.press("Enter");
    await expect(product).toHaveValue("");
    await expect(product).toBeFocused();
  }
  await expect(page.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(3);
  const listTitle = `Kupovina test ${Date.now()}`;
  await title.fill(listTitle);
  await expect(page.getByRole("status").filter({ hasText: "Sačuvano" })).toBeVisible();
  await page.reload();
  await expect(title).toHaveValue(listTitle);
  await page.getByRole("checkbox", { name: "Kupljeno: Mleko" }).click();
  const purchased = page.getByRole("region", { name: "Kupljeno" });
  await expect(purchased.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveValue("Mleko");
  await expect(page.getByRole("region", { name: "Za kupovinu" }).getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath("shopping-list-mobile.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Kupljeno: Mleko" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Kupljeno: Mleko" }).click();
  await expect(page.getByRole("region", { name: "Za kupovinu" }).getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(3);
  await page.getByRole("checkbox", { name: "Kupljeno: Mleko" }).click();
  await page.getByRole("button", { name: "Obriši kupljeno" }).click();
  await expect(page.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Opcije za Hleb" }).click();
  await page.getByRole("menuitem", { name: "Obriši proizvod" }).click();
  await expect(page.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(1);
  const remaining = page.getByRole("textbox", { name: "Proizvod", exact: true });
  await remaining.fill("Jaja 10 kom");
  await remaining.press("Enter");
  await expect(product).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "Kupljeno: Jaja 10 kom" })).toBeVisible();
  await page.reload();
  await expect(remaining).toHaveValue("Jaja 10 kom");
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  // Navigation must flush a title change even before the debounce expires.
  await title.fill(`${listTitle} gotovo`);
  await page.getByRole("link", { name: "Nazad na beleške" }).click();
  await page.getByRole("link", { name: new RegExp(`${listTitle} gotovo`) }).click();
  await expect(title).toHaveValue(`${listTitle} gotovo`);
  await page.getByRole("button", { name: "Slobodna beleška", exact: true }).click();
  await page.getByRole("link", { name: "Nazad na beleške" }).click();
  await page.getByRole("link", { name: new RegExp(`${listTitle} gotovo`) }).click();
  await expect(page.getByRole("button", { name: "Slobodna beleška", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lista za kupovinu", exact: true }).click();
  await page.getByRole("link", { name: "Nazad na beleške" }).click();
  await page.getByRole("link", { name: new RegExp(`${listTitle} gotovo`) }).click();
  await expect(remaining).toHaveValue("Jaja 10 kom");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Obriši belešku", exact: true }).click();
  await expect(page).toHaveURL("/notes");
});

test("failed saves retain the title and products for retry", async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/notes");
  await page.getByRole("button", { name: "Nova lista za kupovinu" }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  let failWrites = true;
  await page.route("**/notes/*", (route) => {
    if (failWrites && route.request().method() === "POST") return route.abort("failed");
    return route.continue();
  });
  const title = `Kupovina retry ${Date.now()}`;
  await page.getByLabel("Naslov", { exact: true }).fill(title);
  await expect(page.getByRole("button", { name: "Pokušaj ponovo" })).toBeVisible();
  failWrites = false;
  await page.getByRole("button", { name: "Pokušaj ponovo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sačuvano" })).toBeVisible();
  failWrites = true;
  await page.getByRole("textbox", { name: "Dodaj proizvod" }).fill("Sir");
  await page.getByRole("textbox", { name: "Dodaj proizvod" }).press("Enter");
  const failed = page.getByRole("alert").filter({ hasText: "Nije sačuvano: Sir" });
  await expect(failed).toBeVisible();
  failWrites = false;
  await page.getByRole("button", { name: "Slobodna beleška", exact: true }).click();
  await page.getByRole("button", { name: "Lista za kupovinu", exact: true }).click();
  await expect(failed).toBeVisible();
  await failed.getByRole("button", { name: "Pokušaj ponovo" }).click();
  await expect(page.getByRole("checkbox", { name: "Kupljeno: Sir" })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Naslov", { exact: true })).toHaveValue(title);
  await expect(page.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveValue("Sir");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Obriši belešku", exact: true }).click();
  await expect(page).toHaveURL("/notes");
});

test("switching a draft note to shopping and immediately renaming preserves its body", async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/notes");
  await page.getByRole("button", { name: "Slobodna beleška", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  const notePath = new URL(page.url()).pathname;
  await page.getByRole("textbox", { name: "Sadržaj beleške u Markdown formatu" }).fill("Spisak za vikend");
  await page.clock.install({ time: new Date("2026-10-12T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-12T12:00:01Z"));
  await page.getByRole("button", { name: "Lista za kupovinu", exact: true }).click();
  await page.getByLabel("Naslov", { exact: true }).fill("Kupovina sa beleškom");
  await page.getByRole("link", { name: "Nazad na beleške" }).click();
  await page.locator(`a[href="${notePath}"]`).click();
  await page.getByRole("button", { name: "Slobodna beleška", exact: true }).click();
  await expect(page.getByText("Spisak za vikend", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Obriši belešku", exact: true }).click();
  await expect(page).toHaveURL("/notes");
});

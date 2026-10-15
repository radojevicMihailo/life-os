import { expect, test, type Page } from "@playwright/test";

test.use({
  baseURL: process.env.LIFE_OS_E2E_URL ?? "http://127.0.0.1:3217",
  channel: process.env.LIFE_OS_E2E_CHANNEL || "chrome",
  viewport: { width: 390, height: 844 },
});

test.beforeEach(async ({ page }) => {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-improvements-test-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/notes");
});

async function removeNote(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Obriši belešku", exact: true }).click();
  await expect(page).toHaveURL("/notes");
}

async function failWrites(page: Page) {
  await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
}

test("browser Back retains failed free-note edits and explicitly restores them", async ({ page }) => {
  await page.getByRole("button", { name: "Slobodna beleška", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  const notePath = new URL(page.url()).pathname;
  await failWrites(page);
  const title = `Nacrt za oporavak ${Date.now()}`;
  const body = "Važan tekst koji nije stigao do servera.";
  await page.getByLabel("Naslov", { exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Sadržaj beleške u Markdown formatu" }).fill(body);
  await expect(page.getByRole("button", { name: "Pokušaj ponovo", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/notes");
  await page.goto(notePath);
  const recovery = page.getByRole("dialog", { name: "Pronađene su nesačuvane izmene" });
  await expect(recovery).toBeVisible();
  await expect(recovery).toContainText(title);
  await expect(recovery).toContainText(body);
  // Recovery is a choice; it must not silently overwrite the stored note.
  await expect(page.getByLabel("Naslov", { exact: true })).toHaveValue("Nova beleška");
  await page.unroute("**/*");
  await recovery.getByRole("button", { name: "Obnovi nacrt i sačuvaj" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sačuvano" })).toBeVisible();
  await page.reload();
  await expect(recovery).toHaveCount(0);
  await expect(page.getByLabel("Naslov", { exact: true })).toHaveValue(title);
  await expect(page.getByText(body, { exact: true }).filter({ visible: true })).toBeVisible();
  await removeNote(page);
});

test("discarding a recovered draft preserves server content", async ({ page }) => {
  await page.getByRole("button", { name: "Slobodna beleška", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  const notePath = new URL(page.url()).pathname;
  await failWrites(page);
  await page.getByLabel("Naslov", { exact: true }).fill("Nesačuvani naslov za odbacivanje");
  await expect(page.getByRole("button", { name: "Pokušaj ponovo", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/notes");
  await page.goto(notePath);
  const recovery = page.getByRole("dialog", { name: "Pronađene su nesačuvane izmene" });
  await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: "Odbaci nacrt i zadrži sačuvanu belešku" }).click();
  await expect(page.getByLabel("Naslov", { exact: true })).toHaveValue("Nova beleška");
  await page.unroute("**/*");
  await page.reload();
  await expect(recovery).toHaveCount(0);
  await removeNote(page);
});

test("failed product text survives movement between sections and browser Back", async ({ page }) => {
  await page.getByRole("button", { name: "Nova lista za kupovinu" }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  const notePath = new URL(page.url()).pathname;
  const addProduct = page.getByRole("textbox", { name: "Dodaj proizvod", exact: true });
  await addProduct.fill("Mleko");
  await addProduct.press("Enter");
  await expect(page.getByRole("checkbox", { name: "Kupljeno: Mleko", exact: true })).toBeEnabled();
  await failWrites(page);
  const product = page.getByRole("textbox", { name: "Proizvod", exact: true });
  await product.fill("Mleko 2 litra");
  await expect(page.getByRole("button", { name: "Ponovi čuvanje", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Kupljeno: Mleko", exact: true }).click();
  await expect(product).toHaveValue("Mleko 2 litra");
  await page.goBack();
  await expect(page).toHaveURL("/notes");
  await page.goto(notePath);
  const recovery = page.getByRole("alert").filter({ hasText: "Pronađen je nesačuvan tekst proizvoda" });
  await expect(recovery).toContainText("Mleko 2 litra");
  await page.unroute("**/*");
  await recovery.getByRole("button", { name: "Obnovi tekst i sačuvaj" }).click();
  await expect(page.getByRole("checkbox", { name: "Kupljeno: Mleko 2 litra", exact: true })).toBeEnabled();
  await page.reload();
  await expect(product).toHaveValue("Mleko 2 litra");
  await expect(recovery).toHaveCount(0);
  await removeNote(page);
});

test("failed additions and unsubmitted input survive browser Back without automatic retries", async ({ page }) => {
  await page.getByRole("button", { name: "Nova lista za kupovinu" }).click();
  await expect(page).toHaveURL(/\/notes\/[\w-]+$/);
  const notePath = new URL(page.url()).pathname;
  await failWrites(page);
  const input = page.getByRole("textbox", { name: "Dodaj proizvod", exact: true });
  await input.fill("Sir za oporavak");
  await input.press("Enter");
  const failed = page.getByRole("alert").filter({ hasText: "Nije sačuvano: Sir za oporavak" });
  await expect(failed).toBeVisible();
  await input.fill("Jogurt još nije poslat");
  await page.goBack();
  await expect(page).toHaveURL("/notes");
  await page.unroute("**/*");
  await page.goto(notePath);
  await expect(failed).toBeVisible();
  await expect(input).toHaveValue("Jogurt još nije poslat");
  // Reopening a pending addition offers a decision, and makes no new request.
  await expect(page.getByRole("textbox", { name: "Proizvod", exact: true })).toHaveCount(0);
  await failed.getByRole("button", { name: "Pokušaj ponovo", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Kupljeno: Sir za oporavak", exact: true })).toBeEnabled();
  await expect(input).toHaveValue("Jogurt još nije poslat");
  await page.reload();
  await expect(failed).toHaveCount(0);
  await expect(input).toHaveValue("Jogurt još nije poslat");
  await removeNote(page);
});

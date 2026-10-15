import { expect, test } from "@playwright/test";
const baseURL = process.env.LIFE_OS_E2E_URL ?? "http://127.0.0.1:3210";
test.use({ baseURL, browserName: "chromium", channel: process.env.LIFE_OS_E2E_CHANNEL || undefined, viewport: { width: 390, height: 844 } });
async function openFinance(page: import("@playwright/test").Page, path: string) {
    await page.goto(path);
    const toggle = page.getByRole("button", { name: "Prikaži iznose" });
    if (await toggle.count())
        await toggle.click();
}
async function login(page: import("@playwright/test").Page) {
    await page.goto("/access");
    await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL("/");
    await openFinance(page, "/finance");
}
test("creates and confirms a plan, adds a goal deadline and searches localized transactions", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await login(page);
    const suffix = Date.now().toString(), name = `Browser plan ${suffix}`;
    await openFinance(page, "/finance/accounts");
    await page.getByLabel("Naziv računa").first().fill(`Banka ${suffix}`);
    await page.getByLabel("Podvrsta računa").first().fill("bank");
    await page.getByRole("button", { name: "Kreiraj račun" }).click();
    await expect(page.getByRole("heading", { name: `Banka ${suffix}`, exact: true })).toBeVisible();
    await openFinance(page, "/finance/settings");
    await page.getByRole("textbox", { name: "Naziv kategorije", exact: true }).fill(`Trošak ${suffix}`);
    await page.getByRole("button", { name: "Kreiraj kategoriju" }).click();
    await expect(page.getByText("Kategorija je kreirana.", { exact: true })).toBeVisible();
    await openFinance(page, "/finance/planning");
    const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Novi prihod ili obaveza" }) });
    await form.getByLabel("Naziv", { exact: true }).fill(name);
    await form.getByRole("combobox", { name: "Račun", exact: true }).selectOption({ label: `Banka ${suffix} · EUR` });
    await form.getByRole("combobox", { name: "Kategorija", exact: true }).selectOption({ label: `Trošak ${suffix}` });
    await form.getByLabel("Iznos u valuti računa").fill("12,50");
    await form.getByRole("button", { name: "Sačuvaj plan", exact: true }).click();
    await expect(page.getByText("Plan je sačuvan.", { exact: true })).toBeVisible();
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card).toBeVisible();
    await card.getByText("Potvrdi plaćanje", { exact: true }).click();
    await card.getByRole("button", { name: "Potvrdi", exact: true }).click();
    await expect(card.getByText("Potvrđeno", { exact: true })).toBeVisible();
    await openFinance(page, `/finance/transactions?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("option", { name: "Rashod", exact: true })).toHaveCount(1);
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    await openFinance(page, "/finance/goals");
    const goal = page.locator("form").filter({ has: page.getByRole("heading", { name: "Novi cilj", exact: true }) });
    await goal.getByLabel("Naziv cilja").fill(`Cilj ${suffix}`);
    await goal.getByLabel("Ciljni iznos").fill("1000");
    await goal.getByLabel("Rok (opciono)").fill("2026-12-31");
    await goal.getByRole("button", { name: "Sačuvaj cilj" }).click();
    await expect(page.getByText("Potrebno mesečno:", { exact: false }).first()).toBeVisible();
    await openFinance(page, "/finance/reports");
    await expect(page.getByRole("heading", { name: "Mesečni izveštaji" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Poslednjih 12 meseci · EUR" })).toBeVisible();
    await page.getByRole("button", { name: "Sakrij iznose" }).click();
    await expect(page.getByRole("img", { name: /Neto imovina kroz/ })).toHaveCount(0);
    expect(errors).toEqual([]);
});
test("new pages fit mobile and desktop and tolerate malformed saved filters", async ({ page }, testInfo) => {
    await login(page);
    for (const width of [360, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ["/finance/planning", "/finance/planning?endDate=2028-01-01", "/finance/reports", "/finance/budgets", "/finance/goals", "/finance/transactions?dateFrom=2026-99-99&cursor=broken&q=%25"]) {
            await openFinance(page, path);
            await expect(page.locator("main h1")).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} at ${width}`).toBe(true);
            if (path === "/finance/reports")
                await page.screenshot({ path: testInfo.outputPath(`reports-${width}.png`), fullPage: true });
        }
    }
});

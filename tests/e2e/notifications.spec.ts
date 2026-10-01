import { expect, test } from "@playwright/test";
const baseURL = process.env.LIFE_OS_E2E_URL ?? "http://localhost:3210";
const password = process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026";
test.use({ baseURL, channel: process.env.LIFE_OS_E2E_CHANNEL || undefined, viewport: { width: 390, height: 844 } });
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(password);
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
}
test("push resources stay public while device APIs require authentication", async ({ request }) => {
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toContain("javascript");
  expect(sw.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/icon-192.png")).status()).toBe(200);
  expect((await request.get("/api/push")).status()).toBe(401);
});
test("device controls register, test and disable a subscription without page overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.context().grantPermissions(["notifications"]);
  // Fake only the browser's external Push Service boundary. The worker, UI and database API are real.
  await page.addInitScript(() => {
    let current: PushSubscription | null = null;
    PushManager.prototype.getSubscription = async () => current;
    PushManager.prototype.subscribe = async (options) => {
      const keys = { p256dh: btoa(String.fromCharCode(4, ...Array(64).fill(1))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""), auth: btoa(String.fromCharCode(...Array(16).fill(2))).replace(/=/g, "") };
      const endpoint = `https://web.push.apple.com/e2e-${crypto.randomUUID()}`;
      current = { endpoint, options, toJSON: () => ({ endpoint, keys }), unsubscribe: async () => { current = null; return true; } } as unknown as PushSubscription;
      return current;
    };
  });
  await signIn(page);
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Uključi notifikacije" }).click();
  await expect(page.getByRole("button", { name: "Isključi notifikacije" })).toBeVisible();
  // The provider send is simulated; acceptance here does not claim physical device delivery.
  await page.route("**/api/push/test", (route) => route.fulfill({ json: { ok: true } }));
  await page.getByRole("button", { name: "Pošalji test" }).click();
  await expect(page.getByRole("status")).toContainText("Test je poslat");
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  }
  await page.getByRole("button", { name: "Isključi notifikacije" }).click();
  await expect(page.getByRole("button", { name: "Uključi notifikacije" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("iPhone browser explains installation before requesting permission", async ({ browser }) => {
  const context = await browser.newContext({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/access`);
  await page.getByLabel("Lozinka").fill(password);
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await page.waitForURL(`${baseURL}/`);
  await page.goto(`${baseURL}/notifications`);
  await expect(page.getByText(/Share → Add to Home Screen/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Uključi notifikacije" })).toHaveCount(0);
  await context.close();
});

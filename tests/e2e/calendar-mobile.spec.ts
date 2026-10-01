import { expect, test } from "@playwright/test";

test.use({
  baseURL: process.env.LIFE_OS_E2E_URL ?? "http://localhost:3210",
  channel: process.env.LIFE_OS_E2E_CHANNEL || undefined,
});

test("calendar defaults to day on phones and supports readable week and month views", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/access");
  await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD ?? "life-os-disposable-smoke-password-2026");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/calendar");

  const day = page.getByRole("button", { name: "Day", exact: true });
  const week = page.getByRole("button", { name: "Week", exact: true });
  const month = page.getByRole("button", { name: "Month", exact: true });
  await expect(day).toHaveAttribute("aria-pressed", "true");
  const heading = page.getByTestId("calendar-period");
  const initial = await heading.textContent();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(heading).not.toHaveText(initial!);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(heading).toHaveText(initial!);

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const button of [day, week, month]) {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(month).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(week).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

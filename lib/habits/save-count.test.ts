import { expect, it } from "vitest";
import { saveHabitCount } from "./save-count";

it("restores the last saved count when validation fails", async () => {
  expect(await saveHabitCount(2, 5, async () => ({ ok: false, error: "Greška" }))).toEqual({ count: 2, error: "Greška" });
});
it("restores the last saved count when the request throws", async () => {
  const result = await saveHabitCount(0, 1, async () => { throw new Error("offline"); });
  expect(result.count).toBe(0);
  expect(result.error).toBeTruthy();
});
it("retains the new count after a successful save", async () => {
  expect(await saveHabitCount(0, 1, async () => ({ ok: true }))).toEqual({ count: 1, error: null });
});

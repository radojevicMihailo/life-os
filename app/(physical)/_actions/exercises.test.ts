import { beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleQueryError } from "drizzle-orm";

const { execute, revalidate } = vi.hoisted(() => ({
  execute: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: () => ({ returning: execute }) }),
    update: () => ({ set: () => ({ where: execute }) }),
  },
}));
vi.mock("./_revalidate", () => ({ revalidatePhysicalRoutes: revalidate }));

import { addExercise, updateExercise } from "./exercises";

const id = "2d978b31-3c20-4738-b7d3-9edfecb7cf7b";
const duplicate = () => Object.assign(new Error("duplicate key"), { code: "23505" });

describe("exercise name conflicts", () => {
  beforeEach(() => vi.resetAllMocks());

  for (const [operation, run] of [
    ["adding", () => addExercise({ name: "Izdržaj u čučnju" })],
    ["renaming", () => updateExercise({ id, name: "Izdržaj u čučnju" })],
  ] as const) {
    it.each(["direct", "wrapped"])(`returns a validation error when ${operation} with a %s duplicate error`, async (kind) => {
      const error = duplicate();
      execute.mockRejectedValueOnce(kind === "wrapped" ? new DrizzleQueryError("query", [], error) : error);

      await expect(run()).resolves.toEqual({ ok: false, error: "Exercise name must be unique" });
      expect(revalidate).not.toHaveBeenCalled();
    });

    it(`preserves unexpected database failures when ${operation}`, async () => {
      const error = new DrizzleQueryError("query", [], Object.assign(new Error("connection failed"), { code: "08006" }));
      execute.mockRejectedValueOnce(error);
      await expect(run()).rejects.toBe(error);
      expect(revalidate).not.toHaveBeenCalled();
    });
  }

  it("adds an exercise and refreshes the routes", async () => {
    execute.mockResolvedValueOnce([{ id }]);
    await expect(addExercise({ name: "New exercise" })).resolves.toEqual({ ok: true, data: { id } });
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("updates an exercise and refreshes the routes", async () => {
    execute.mockResolvedValueOnce([]);
    await expect(updateExercise({ id, name: "New name" })).resolves.toEqual({ ok: true, data: undefined });
    expect(revalidate).toHaveBeenCalledOnce();
  });
});

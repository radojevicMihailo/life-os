import { describe, expect, it } from "vitest";
import { computeReorder } from "./reorder";

const items = [
  { id: "a", position: 0 },
  { id: "b", position: 1 },
  { id: "c", position: 2 },
];

describe("computeReorder", () => {
  it("moves a middle item up by swapping positions with its predecessor", () => {
    expect(computeReorder(items, "b", "up")).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
  });

  it("moves a middle item down by swapping with its successor", () => {
    expect(computeReorder(items, "b", "down")).toEqual([
      { id: "b", position: 2 },
      { id: "c", position: 1 },
    ]);
  });

  it("returns [] when moving the first item up", () => {
    expect(computeReorder(items, "a", "up")).toEqual([]);
  });

  it("returns [] when moving the last item down", () => {
    expect(computeReorder(items, "c", "down")).toEqual([]);
  });

  it("returns [] when the id is not present", () => {
    expect(computeReorder(items, "z", "up")).toEqual([]);
  });
});

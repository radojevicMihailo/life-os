import { describe, expect, it } from "vitest";
import { setSummary } from "./setSummary";
import type { SetEntry } from "@/db/schema/physical";

describe("setSummary", () => {
  it("empty list", () => {
    expect(setSummary([])).toEqual({ totalVolume: 0, maxWeight: 0, totalReps: 0, setCount: 0 });
  });
  it("single set", () => {
    const sets: SetEntry[] = [{ weight: 100, reps: 5 }];
    expect(setSummary(sets)).toEqual({ totalVolume: 500, maxWeight: 100, totalReps: 5, setCount: 1 });
  });
  it("mixed sets", () => {
    const sets: SetEntry[] = [
      { weight: 60, reps: 10 },
      { weight: 80, reps: 8 },
      { weight: 100, reps: 5 },
    ];
    expect(setSummary(sets)).toEqual({
      totalVolume: 600 + 640 + 500,
      maxWeight: 100,
      totalReps: 23,
      setCount: 3,
    });
  });
});

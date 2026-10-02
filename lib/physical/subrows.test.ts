import { describe, expect, it } from "vitest";
import { moveSubrow, withSubrowKey } from "./subrows";

describe("activity subrow identity", () => {
  it("moves each duration input identity with its value instead of reusing the destination input", () => {
    const rows = [
      withSubrowKey({ sortOrder: 0, values: { duration: 60 } }),
      withSubrowKey({ sortOrder: 1, values: { duration: 120 } }),
    ];
    const moved = moveSubrow(rows, 0, 1);
    expect(moved.map(row => [row.rowKey, row.values.duration])).toEqual([
      [rows[1].rowKey, 120], [rows[0].rowKey, 60],
    ]);
    expect(moved.map(row => row.sortOrder)).toEqual([0, 1]);
    expect(moveSubrow(moved, 1, -1).map(row => row.rowKey)).toEqual(rows.map(row => row.rowKey));
    expect(rows[0].sortOrder).toBe(0);
  });

  it("gives identical new rows different keys and preserves survivor identity after deletion", () => {
    const row = { sortOrder: 0, values: { duration: 60 } };
    const rows = [withSubrowKey(row), withSubrowKey(row)];
    expect(rows[0].rowKey).not.toBe(rows[1].rowKey);
    const survivor = rows.filter((_, index) => index !== 0).map((item, sortOrder) => ({ ...item, sortOrder }));
    expect(survivor[0].rowKey).toBe(rows[1].rowKey);
    expect(moveSubrow(survivor, 0, -1)).toBe(survivor);
  });
});

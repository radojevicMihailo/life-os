/** A form identity stays with a row when its position changes. */
export function withSubrowKey<T>(row: T): T & { rowKey: string } {
  return { ...row, rowKey: crypto.randomUUID() };
}

export function moveSubrow<T extends { sortOrder: number }>(rows: T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction;
  if (index < 0 || index >= rows.length || destination < 0 || destination >= rows.length) return rows;
  const next = rows.slice();
  [next[index], next[destination]] = [next[destination], next[index]];
  return next.map((row, sortOrder) => ({ ...row, sortOrder }));
}

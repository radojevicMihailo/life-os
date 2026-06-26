export type PositionedItem = { id: string; position: number };

export function computeReorder(
  items: PositionedItem[],
  id: string,
  direction: "up" | "down",
): { id: string; position: number }[] {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((i) => i.id === id);
  if (idx === -1) return [];
  const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= sorted.length) return [];
  const current = sorted[idx];
  const neighbor = sorted[neighborIdx];
  return [
    { id: current.id, position: neighbor.position },
    { id: neighbor.id, position: current.position },
  ];
}

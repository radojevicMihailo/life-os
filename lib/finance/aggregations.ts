export type EurRow = {
  accountId: string;
  groupId: string | null;
  groupName: string | null;
  bucketId: string | null;
  bucketName: string | null;
  eur: number;
};

export type GroupTotal = { groupId: string | null; name: string; eur: number };
export type BucketTotal = { bucketId: string | null; name: string; eur: number };

export function computeGroupTotals(rows: EurRow[]): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const r of rows) {
    const key = r.groupId ?? "__null__";
    const existing = map.get(key);
    if (existing) {
      existing.eur += r.eur;
    } else {
      map.set(key, {
        groupId: r.groupId,
        name: r.groupName ?? "Bez grupe",
        eur: r.eur,
      });
    }
  }
  return Array.from(map.values())
    .filter((g) => g.eur !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function computeBucketTotals(rows: EurRow[]): BucketTotal[] {
  const map = new Map<string, BucketTotal>();
  for (const r of rows) {
    const key = r.bucketId ?? "__null__";
    const existing = map.get(key);
    if (existing) {
      existing.eur += r.eur;
    } else {
      map.set(key, {
        bucketId: r.bucketId,
        name: r.bucketName ?? "Bez buketa",
        eur: r.eur,
      });
    }
  }
  const filtered = Array.from(map.values()).filter((b) => b.eur !== 0);
  return filtered.sort((a, b) => {
    if (a.bucketId === null) return 1;
    if (b.bucketId === null) return -1;
    return b.eur - a.eur;
  });
}

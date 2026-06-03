import { describe, expect, it } from "vitest";
import { computeGroupTotals, computeBucketTotals, type EurRow } from "./aggregations";

const rows: EurRow[] = [
  { accountId: "a1", groupId: "g1", groupName: "Banka", bucketId: "b1", bucketName: "Raiff", eur: 100 },
  { accountId: "a2", groupId: "g1", groupName: "Banka", bucketId: "b1", bucketName: "Raiff", eur: 50 },
  { accountId: "a3", groupId: "g2", groupName: "Gotovina", bucketId: null, bucketName: null, eur: 25 },
  { accountId: "a4", groupId: null, groupName: null, bucketId: "b2", bucketName: "IBKR", eur: 200 },
  { accountId: "a5", groupId: "g1", groupName: "Banka", bucketId: "b1", bucketName: "Raiff", eur: 0 },
];

describe("computeGroupTotals", () => {
  it("sums per group, labels null as 'Bez grupe', skips zero totals", () => {
    expect(computeGroupTotals(rows)).toEqual([
      { groupId: "g1", name: "Banka", eur: 150 },
      { groupId: null, name: "Bez grupe", eur: 200 },
      { groupId: "g2", name: "Gotovina", eur: 25 },
    ]);
  });

  it("returns empty array when all rows are zero", () => {
    expect(computeGroupTotals([{ accountId: "x", groupId: "g", groupName: "G", bucketId: null, bucketName: null, eur: 0 }])).toEqual([]);
  });
});

describe("computeBucketTotals", () => {
  it("sums per bucket, labels null as 'Bez buketa', null bucket sorted last", () => {
    expect(computeBucketTotals(rows)).toEqual([
      { bucketId: "b2", name: "IBKR", eur: 200 },
      { bucketId: "b1", name: "Raiff", eur: 150 },
      { bucketId: null, name: "Bez buketa", eur: 25 },
    ]);
  });

  it("omits null bucket row when its total is zero", () => {
    const noNull: EurRow[] = [
      { accountId: "a", groupId: null, groupName: null, bucketId: "b1", bucketName: "B1", eur: 10 },
    ];
    expect(computeBucketTotals(noNull)).toEqual([{ bucketId: "b1", name: "B1", eur: 10 }]);
  });
});

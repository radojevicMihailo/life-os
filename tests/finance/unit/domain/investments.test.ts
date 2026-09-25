import { describe, expect, it } from "vitest";

import {
  disposeFifo,
  type InvestmentLot,
} from "@/modules/finance/domain/investments";

function lot(
  id: string,
  quantity: string,
  unitCost: string,
  options?: { acquiredAt?: string; feeAmount?: string },
): InvestmentLot {
  return {
    id,
    acquiredAt: new Date(options?.acquiredAt ?? "2026-01-01T00:00:00.000Z"),
    quantity,
    remainingQuantity: quantity,
    costAmount: (BigInt(quantity) * BigInt(unitCost)).toString(),
    feeAmount: options?.feeAmount ?? "0",
  };
}

describe("investment FIFO disposal", () => {
  it("consumes oldest lots and calculates the exact brief example", () => {
    const result = disposeFifo(
      [lot("2", "2", "100"), lot("3", "3", "120")],
      { quantity: "2.5", grossProceeds: "400", saleFee: "10" },
    );

    expect(result.disposals.map((row) => row.quantity)).toEqual(["2", "0.5"]);
    expect(result.disposals.map((row) => row.lotId)).toEqual(["2", "3"]);
    expect(result.netProceeds).toBe("390");
    expect(result.costBasis).toBe("260");
    expect(result.realizedReturn).toBe("130");
    expect(result.remainingLots.map((row) => row.remainingQuantity)).toEqual([
      "0",
      "2.5",
    ]);
  });

  it("uses stable lot ID to break equal acquisition timestamps", () => {
    const result = disposeFifo(
      [lot("lot-b", "1", "20"), lot("lot-a", "1", "10")],
      { quantity: "1", grossProceeds: "30", saleFee: "0" },
    );

    expect(result.disposals).toMatchObject([
      { lotId: "lot-a", quantity: "1", costBasisAmount: "10" },
    ]);
  });

  it("adds acquisition fees to proportionally disposed basis", () => {
    const result = disposeFifo(
      [lot("lot-1", "4", "25", { feeAmount: "8" })],
      { quantity: "1", grossProceeds: "40", saleFee: "0" },
    );

    expect(result.disposals[0]).toMatchObject({
      quantity: "1",
      costBasisAmount: "27",
    });
    expect(result.costBasis).toBe("27");
    expect(result.realizedReturn).toBe("13");
  });

  it("reduces and proportionally allocates proceeds by the sale fee with final correction", () => {
    const result = disposeFifo(
      [lot("a", "1", "1"), lot("b", "1", "1"), lot("c", "1", "1")],
      { quantity: "3", grossProceeds: "10", saleFee: "0" },
    );

    expect(result.disposals.map((row) => row.proceedsAmount)).toEqual([
      "3.333333333333333333",
      "3.333333333333333333",
      "3.333333333333333334",
    ]);
    expect(result.netProceeds).toBe("10");
  });

  it("assigns all division dust to the final partial remainder", () => {
    const result = disposeFifo(
      [{
        id: "a",
        acquiredAt: new Date("2026-01-01T00:00:00.000Z"),
        quantity: "3",
        remainingQuantity: "3",
        costAmount: "10",
        feeAmount: "0",
      }],
      { quantity: "3", grossProceeds: "11", saleFee: "0" },
    );

    expect(result.disposals).toEqual([
      {
        lotId: "a",
        quantity: "3",
        proceedsAmount: "11",
        costBasisAmount: "10",
      },
    ]);
  });

  it("assigns remaining acquisition-basis dust when a previously partial lot closes", () => {
    const result = disposeFifo(
      [{
        id: "a",
        acquiredAt: new Date("2026-01-01T00:00:00.000Z"),
        quantity: "3",
        remainingQuantity: "2",
        costAmount: "10",
        feeAmount: "2",
        disposedCostBasisAmount: "4",
      }],
      { quantity: "2", grossProceeds: "10", saleFee: "0" },
    );

    expect(result.disposals[0]?.costBasisAmount).toBe("8");
    expect(result.remainingLots[0]?.remainingQuantity).toBe("0");
  });

  it("rejects disposal above the total open quantity", () => {
    expect(() =>
      disposeFifo([lot("a", "1", "10")], {
        quantity: "1.00000001",
        grossProceeds: "20",
        saleFee: "0",
      }),
    ).toThrowError(expect.objectContaining({
      name: "DomainError",
      code: "investment_quantity_insufficient",
    }));
  });

  it("supports all active asset classes and enforces their quantity precision", () => {
    for (const assetClass of ["stock", "etf"] as const) {
      expect(
        disposeFifo(
          [{ ...lot("a", "1", "10"), remainingQuantity: "0.12345678" }],
          {
            assetClass,
            quantity: "0.12345678",
            grossProceeds: "20",
            saleFee: "0",
          },
        ).disposals[0]?.quantity,
      ).toBe("0.12345678");
    }

    expect(
      disposeFifo(
        [{
          ...lot("crypto", "1", "10"),
          remainingQuantity: "0.123456789012345678",
        }],
        {
          assetClass: "crypto",
          quantity: "0.123456789012345678",
          grossProceeds: "20",
          saleFee: "0",
        },
      ).disposals[0]?.quantity,
    ).toBe("0.123456789012345678");
  });
});

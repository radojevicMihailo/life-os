import Decimal from "decimal.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { disposeFifo } from "@/modules/finance/domain/investments";

describe("investment FIFO properties", () => {
  it("preserves purchased quantity as disposed plus remaining at 18 decimals", () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: BigInt("1"), max: BigInt("1000000000000000000") }), {
          minLength: 1,
          maxLength: 12,
        }),
        fc.bigInt({ min: BigInt("1"), max: BigInt("1000000000000000000") }),
        (lotUnits, requestedUnits) => {
          const totalUnits = lotUnits.reduce(
            (sum, value) => sum + value,
            BigInt("0"),
          );
          const disposalUnits = (requestedUnits % totalUnits) + BigInt("1");
          const scale = new Decimal(10).pow(18);
          const quantity = new Decimal(disposalUnits.toString()).div(scale);
          const lots = lotUnits.map((units, index) => {
            const amount = new Decimal(units.toString()).div(scale).toFixed(18);
            return {
              id: `lot-${index.toString().padStart(2, "0")}`,
              acquiredAt: new Date(1_700_000_000_000 + index),
              quantity: amount,
              remainingQuantity: amount,
              costAmount: new Decimal(units.toString()).times("0.00000001").toFixed(18),
              feeAmount: "0",
            };
          });

          const result = disposeFifo(lots, {
            assetClass: "crypto",
            quantity: quantity.toFixed(18),
            grossProceeds: "100000000000000000",
            saleFee: "0",
          });
          const purchased = lots.reduce(
            (sum, row) => sum.plus(row.quantity),
            new Decimal(0),
          );
          const disposed = result.disposals.reduce(
            (sum, row) => sum.plus(row.quantity),
            new Decimal(0),
          );
          const remaining = result.remainingLots.reduce(
            (sum, row) => sum.plus(row.remainingQuantity),
            new Decimal(0),
          );

          expect(disposed.plus(remaining).toFixed(18)).toBe(
            purchased.toFixed(18),
          );
        },
      ),
      { numRuns: 250 },
    );
  });
});

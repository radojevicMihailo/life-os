import fc from "fast-check";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  assertBalanced,
  type JournalDraft,
  type LedgerAccount,
} from "@/modules/finance/domain/ledger";

const currencies = ["EUR", "USD", "RSD", "HUF"] as const;

function assetAccount(currencyCode: (typeof currencies)[number]): LedgerAccount {
  return {
    id: `asset-${currencyCode}`,
    classification: "asset",
    currencyCode,
  };
}

function incomeAccount(currencyCode: (typeof currencies)[number]): LedgerAccount {
  return {
    id: `income-${currencyCode}`,
    classification: "income",
    currencyCode,
  };
}

describe("assertBalanced properties", () => {
  it("keeps every generated currency independently balanced to exact zero", () => {
    const moneyLegArb = fc.record({
      currencyCode: fc.constantFrom(...currencies),
      minorUnits: fc.integer({ min: 1, max: 500_000 }),
    });

    const journalArb = fc
      .array(moneyLegArb, {
        minLength: 1,
        maxLength: currencies.length,
      })
      .map((legs): JournalDraft => ({
        id: "prop-journal",
        type: "income",
        source: "web",
        postings: legs.flatMap(({ currencyCode, minorUnits }, index) => {
          const amount = new Decimal(minorUnits).div(100).toFixed(2);

          return [
            {
              account: assetAccount(currencyCode),
              currencyCode,
              amount,
            },
            {
              account: incomeAccount(currencyCode),
              currencyCode,
              amount: new Decimal(amount).negated().toFixed(2),
              categoryId: `category-${index}`,
            },
          ];
        }),
      }));

    fc.assert(
      fc.property(journalArb, (draft) => {
        expect(() => assertBalanced(draft)).not.toThrow();

        const sums = new Map<string, Decimal>();

        for (const posting of draft.postings) {
          sums.set(
            posting.currencyCode,
            (sums.get(posting.currencyCode) ?? new Decimal(0)).plus(
              posting.amount,
            ),
          );
        }

        for (const sum of sums.values()) {
          expect(sum.equals(0)).toBe(true);
        }
      }),
    );
  });
});

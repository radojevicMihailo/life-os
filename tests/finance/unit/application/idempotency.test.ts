import { describe, expect, it } from "vitest";

import {
  canonicalizeJson,
  fingerprint,
} from "@/modules/finance/application/idempotency";
import { parseShortcutRequest } from "@/modules/finance/application/shortcut";

describe("idempotency request fingerprints", () => {
  it("produces the same fingerprint regardless of object key order", () => {
    expect(fingerprint({ amount: "1.00", operation: "expense" })).toBe(
      fingerprint({ operation: "expense", amount: "1.00" }),
    );
  });

  it("canonicalizes nested JSON objects while preserving array order", () => {
    expect(
      canonicalizeJson({
        operation: "transfer",
        fee: { categoryId: "fees", amount: "2.50" },
        tags: ["second", "first"],
      }),
    ).toBe(
      '{"fee":{"amount":"2.50","categoryId":"fees"},"operation":"transfer","tags":["second","first"]}',
    );
  });

  it("normalizes decimal and time strings before fingerprinting", () => {
    const first = parseShortcutRequest({
      operation: "expense",
      accountId: "cash-eur",
      categoryId: "groceries",
      amount: "001.2300",
      occurredAt: "2026-08-22T14:00:00+02:00",
      note: "  Ručak  ",
    });
    const second = parseShortcutRequest({
      operation: "expense",
      accountId: "cash-eur",
      categoryId: "groceries",
      amount: "1.23",
      occurredAt: "2026-08-22T12:00:00.000Z",
      note: "Ručak",
    });

    expect(first).toEqual({
      operation: "expense",
      accountId: "cash-eur",
      categoryId: "groceries",
      amount: "1.23",
      occurredAt: "2026-08-22T12:00:00.000Z",
      note: "Ručak",
    });
    expect(fingerprint(first)).toBe(fingerprint(second));
  });

  it("rejects receivable requests without a meaningful counterparty", () => {
    expect(() =>
      parseShortcutRequest({
        operation: "receivable_out",
        fromAccountId: "cash-eur",
        receivableAccountId: "receivable-eur",
        amount: "10.00",
        counterparty: "   ",
      }),
    ).toThrow();
  });

  it("rejects transfer requests that mix a same-currency amount with FX fields", () => {
    expect(() =>
      parseShortcutRequest({
        operation: "transfer",
        fromAccountId: "cash-eur",
        toAccountId: "cash-usd",
        amount: "10.00",
        toAmount: "11.00",
      }),
    ).toThrow();
  });
});

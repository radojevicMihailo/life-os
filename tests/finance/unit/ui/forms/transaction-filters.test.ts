import { describe, expect, it } from "vitest";
import { parseTransactionFilters, encodeTransactionCursor } from "@/modules/finance/ui/forms/transaction-filters";
describe("transaction filter URLs", () => {
    it("rejects calendar overflow before SQL date casts", () => {
        expect(parseTransactionFilters({ dateFrom: "2026-02-30", dateTo: "2024-02-29" })).toMatchObject({ dateFrom: undefined, dateTo: "2024-02-29" });
    });
    it("normalizes description search and rejects broken cursors", () => {
        expect(parseTransactionFilters({ q: "  kafa  ", cursor: "broken" })).toMatchObject({ q: "kafa", cursor: undefined });
    });
    it("roundtrips a stable timestamp/id cursor", () => {
        const cursor = { occurredAt: "2026-10-15T10:00:00.000Z", id: "journal-5" };
        expect(parseTransactionFilters({ cursor: encodeTransactionCursor(cursor) }).cursor).toEqual(cursor);
    });
    it("bounds search and ignores an unknown type", () => {
        expect(parseTransactionFilters({ q: "a".repeat(300), type: "evil" })).toMatchObject({ q: "a".repeat(200), type: undefined });
    });
});

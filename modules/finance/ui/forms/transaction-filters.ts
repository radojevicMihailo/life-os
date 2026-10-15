import type { TransactionFilters } from "../../read-models/transactions";
import { isCalendarDate } from "../../domain/calendar";
import { transactionTypeLabels } from "../components/transaction-labels";
export function encodeTransactionCursor(cursor: NonNullable<TransactionFilters["cursor"]>) {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}
export function parseTransactionFilters(params: Record<string, string | string[] | undefined>): TransactionFilters {
    const first = (key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];
    const bounded = (key: string) => first(key)?.trim().slice(0, 200) || undefined;
    let cursor: TransactionFilters["cursor"];
    try {
        const raw = first("cursor");
        if (raw && raw.length <= 1000) {
            const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
            if (typeof parsed.id === "string" && parsed.id.length > 0 && parsed.id.length <= 200 && typeof parsed.occurredAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(parsed.occurredAt) && Number.isFinite(Date.parse(parsed.occurredAt)))
                cursor = { id: parsed.id, occurredAt: new Date(parsed.occurredAt).toISOString() };
        }
    }
    catch { /* A malformed saved URL resets pagination. */ }
    const type = first("type");
    return { accountId: bounded("accountId"), categoryId: bounded("categoryId"), q: bounded("q"), cursor,
        dateFrom: isCalendarDate(first("dateFrom")) ? first("dateFrom") : undefined,
        dateTo: isCalendarDate(first("dateTo")) ? first("dateTo") : undefined,
        type: type && Object.hasOwn(transactionTypeLabels, type) ? type as TransactionFilters["type"] : undefined };
}

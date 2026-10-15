import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const query = vi.hoisted(() => ({
  selection: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), offset: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: (fields: unknown) => {
  query.selection(fields);
  return { from: () => ({ leftJoin: () => ({ where: (where: unknown) => {
    query.where(where);
    return { orderBy: (...order: unknown[]) => {
      query.orderBy(...order);
      return { limit: (limit: number) => { query.limit(limit); return { offset: query.offset }; } };
    } };
  } }) }) };
} } }));
import { getNotesPage } from "./notes";

const dialect = new PgDialect();
describe("server note search", () => {
  beforeEach(() => { vi.clearAllMocks(); query.offset.mockResolvedValue([]); });
  it("searches the entire body while selecting a bounded preview and stable page", async () => {
    await getNotesPage({ query: "50%_\\off", category: "123e4567-e89b-42d3-a456-426614174000", page: 2 });
    const where = dialect.sqlToQuery(query.where.mock.calls[0][0]);
    expect(where.sql).toContain('"notes"."title" ilike');
    expect(where.sql).toContain('"notes"."body" ilike');
    expect(where.params).toEqual(["%50\\%\\_\\\\off%", "%50\\%\\_\\\\off%", "123e4567-e89b-42d3-a456-426614174000"]);
    const body = dialect.sqlToQuery(query.selection.mock.calls[0][0].body);
    expect(body.sql).toBe('left("notes"."body", $1)');
    expect(body.params).toEqual([240]);
    expect(query.orderBy.mock.calls[0].map((order: SQL) => dialect.sqlToQuery(order).sql)).toEqual(['"notes"."updated_at" desc', '"notes"."id" asc']);
    expect(query.limit).toHaveBeenCalledWith(31);
    expect(query.offset).toHaveBeenCalledWith(30);
  });
  it("uses the extra row only to signal more results", async () => {
    query.offset.mockResolvedValue(Array.from({ length: 31 }, (_, id) => ({ id })));
    const result = await getNotesPage({ query: "", category: "all", page: 1 });
    expect(result.notes).toHaveLength(30);
    expect(result.hasMore).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const { removeWhere, touchWhere, revalidate } = vi.hoisted(() => ({
  removeWhere: vi.fn(), touchWhere: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/db", () => ({ db: {
  delete: () => ({ where: removeWhere }),
  update: () => ({ set: () => ({ where: touchWhere }) }),
} }));
vi.mock("./_revalidate", () => ({ revalidateNoteRoutes: revalidate }));

import { clearDoneItems } from "./notes";

const noteId = "2d978b31-3c20-4738-b7d3-9edfecb7cf7b";
describe("clearing purchased items", () => {
  beforeEach(() => vi.resetAllMocks());

  it("deletes only completed items belonging to the requested note", async () => {
    await expect(clearDoneItems({ noteId })).resolves.toEqual({ ok: true, data: undefined });
    const query = new PgDialect().sqlToQuery(removeWhere.mock.calls[0][0]);
    expect(query.sql).toBe('(\"note_items\".\"note_id\" = $1 and \"note_items\".\"done\" = $2)');
    expect(query.params).toEqual([noteId, true]);
    expect(touchWhere).toHaveBeenCalledOnce();
    expect(revalidate).toHaveBeenCalledWith({ noteId });
  });

  it("rejects invalid note IDs without deleting anything", async () => {
    expect((await clearDoneItems({ noteId: "invalid" })).ok).toBe(false);
    expect(removeWhere).not.toHaveBeenCalled();
  });
});

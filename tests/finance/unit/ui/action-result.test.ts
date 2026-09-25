import { describe, expect, it, vi } from "vitest";

import { executeAction } from "@/modules/finance/ui/actions/result";

const guardedRuntime = (revalidate: (path: string) => void) => ({
  guard: async () => undefined,
  revalidate,
});

describe("Server Action result truthfulness", () => {
  it("keeps a committed mutation successful when post-commit revalidation fails", async () => {
    const work = vi.fn(async () => ({ id: "committed" }));
    const result = await executeAction(work, {
      financial: true,
      revalidate: ["/transactions"],
    }, guardedRuntime(() => { throw new Error("cache unavailable"); }));

    expect(work).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, value: { id: "committed" } });
  });

  it("still reports no write and skips revalidation when financial work fails", async () => {
    const revalidate = vi.fn();
    const result = await executeAction(async () => {
      throw new Error("write failed");
    }, {
      financial: true,
      revalidate: ["/transactions"],
    }, guardedRuntime(revalidate));

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? "" : result.message).toContain("Ništa nije upisano.");
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("never invokes work when the action guard rejects the request", async () => {
    const work = vi.fn(async () => ({ id: "must-not-run" }));
    const result = await executeAction(work, { financial: true }, {
      guard: async () => { throw Object.assign(new Error("unauthorized"), { code: "unauthorized" }); },
      revalidate: vi.fn(),
    });

    expect(work).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false });
  });
});

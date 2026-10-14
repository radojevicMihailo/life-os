import { describe, expect, it } from "vitest";
import { AlphaVantageClient } from "@/modules/finance/adapters/alpha-vantage/client";
import { resolveInstrument } from "@/modules/finance/application/investments";
import type { ApplicationDependencies } from "@/modules/finance/application/ports";
import { mapApiError } from "@/modules/finance/ui/api-errors";

describe("manual Alpha instrument quota errors", () => {
  it("maps only the exact exhausted-quota error to a safe actionable HTTP429 response", () => {
    const result = mapApiError(new Error("alpha_vantage_request_budget_exhausted"));
    expect(result.status).toBe(429);
    expect(result.body.error.code).toBe("alpha_vantage_request_budget_exhausted");
    expect(result.body.error.message).toContain("25");
    expect(result.body.error.message).toContain("24");
    expect(mapApiError(new Error("alpha_vantage_request_budget_exhausted secret=private")).body.error).toEqual({
      code: "internal_error", message: "Došlo je do neočekivane greške.",
    });
  });

  it.each([0, 1])("reports quota exhaustion after %s allowed requests without persisting an unverified instrument", async (allowance) => {
    let outgoing = 0;
    const deps: ApplicationDependencies = {
      ids: { nextId: () => "test-instrument" },
      clock: { now: () => new Date() },
      unitOfWork: { run: async () => { throw new Error("must_not_write_unverified_instrument"); } },
    };
    const client = new AlphaVantageClient({
      apiKey: "not-a-secret", clock: deps.clock, signal: new AbortController().signal,
      reserveRequest: async () => outgoing < allowance,
      fetch: async () => {
        outgoing += 1;
        return Response.json({ bestMatches: [{
          "1. symbol": "TEST.DEX", "2. name": "Test stock", "4. region": "Germany", "8. currency": "EUR",
        }] });
      },
    });
    const outcome = resolveInstrument(deps, {
      symbol: "TEST", name: "Test stock", class: "stock", exchange: "Xetra", quoteCurrencyCode: "EUR", provider: "alpha_vantage",
    }, client);
    await expect(outcome).rejects.toThrow("alpha_vantage_request_budget_exhausted");
    expect(outgoing).toBe(allowance);
  });
});

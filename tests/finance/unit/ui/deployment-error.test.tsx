import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import ProtectedError from "@/app/finance/error";

describe("finance error recovery", () => {
  it("offers a full refresh without replaying an action from an older deployment", () => {
    const reset = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });
    try {
      const panel = ProtectedError({ error: new UnrecognizedActionError("Action missing"), reset });
      const html = renderToStaticMarkup(panel);
      expect(html).toContain("Aplikacija je ažurirana.");
      expect(html).toContain("Zahtev nije izvršen.");
      expect(html).toContain("Osveži aplikaciju");
      panel.props.onRetry();
      expect(reload).toHaveBeenCalledOnce();
      expect(reset).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("preserves reset recovery for ordinary read errors", () => {
    const reset = vi.fn();
    const panel = ProtectedError({ error: new Error("Database unavailable"), reset });
    expect(renderToStaticMarkup(panel)).toContain("Čitanje finansijskih podataka nije uspelo.");
    panel.props.onRetry();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("does not classify a generic error by its text", () => {
    const panel = ProtectedError({ error: new Error('Server Action was not found on the server'), reset: vi.fn() });
    expect(renderToStaticMarkup(panel)).not.toContain("Zahtev nije izvršen.");
  });
});

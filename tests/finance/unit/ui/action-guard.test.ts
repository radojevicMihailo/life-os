import { describe, expect, it } from "vitest";

import { guardActionRequest } from "@/modules/finance/ui/actions/guard";
import { issueSession, requireWebSession, SESSION_COOKIE_NAME } from "@/modules/finance/auth/cookie";

const signingSecret = "12345678901234567890123456789012";
const now = new Date("2026-08-22T12:00:00.000Z");

describe("Server Action request guard", () => {
  it("requires both an explicit same-origin header and a valid current web session", async () => {
    const sessionChecks: Array<string | null> = [];
    const options = {
      appOrigin: "https://finance.example",
      requireSession: async (cookieHeader: string | null) => {
        sessionChecks.push(cookieHeader);
      },
    };

    await expect(guardActionRequest(new Headers({
      cookie: "finance_session=valid",
      origin: "https://finance.example",
    }), options)).resolves.toBeUndefined();
    expect(sessionChecks).toEqual(["finance_session=valid"]);

    await expect(guardActionRequest(new Headers({
      cookie: "finance_session=valid",
      origin: "https://evil.example",
    }), options)).rejects.toMatchObject({ code: "invalid_origin" });
    expect(sessionChecks).toHaveLength(1);
  });

  it("rejects missing and invalid cookies using real session verification", async () => {
    const requireSession = (cookieHeader: string | null) => requireWebSession(
      { cookieHeader },
      { currentAccessVersion: 3, now, signingSecret },
    );
    const headers = (cookie?: string) => new Headers({
      origin: "https://finance.example",
      ...(cookie ? { cookie } : {}),
    });

    await expect(guardActionRequest(headers(), {
      appOrigin: "https://finance.example",
      requireSession,
    })).rejects.toMatchObject({ code: "unauthorized" });
    await expect(guardActionRequest(headers(`${SESSION_COOKIE_NAME}=invalid`), {
      appOrigin: "https://finance.example",
      requireSession,
    })).rejects.toMatchObject({ code: "unauthorized" });

    const valid = await issueSession({ accessVersion: 3 }, { now, signingSecret });
    await expect(guardActionRequest(headers(`${SESSION_COOKIE_NAME}=${valid.cookie.value}`), {
      appOrigin: "https://finance.example",
      requireSession,
    })).resolves.toBeUndefined();
  });
});

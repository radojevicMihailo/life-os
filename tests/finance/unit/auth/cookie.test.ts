import { SignJWT, decodeJwt } from "jose";
import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  issueSession,
  requireWebSession,
  verifySession,
} from "@/modules/finance/auth/cookie";

const signingSecret = "12345678901234567890123456789012";
const otherSigningSecret = "abcdefghijklmnopqrstuvwxzy123456";
const now = new Date("2026-08-22T12:00:00.000Z");

describe("signed web session cookie", () => {
  it("issues an HttpOnly Secure SameSite=Lax cookie with only version timing claims", async () => {
    const session = await issueSession(
      { accessVersion: 3 },
      { now, signingSecret, ttlSeconds: 3_600 },
    );

    expect(session.cookie).toMatchObject({
      httpOnly: true,
      maxAge: 3_600,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    expect(decodeJwt(session.cookie.value)).toEqual({
      accessVersion: 3,
      exp: 1_787_403_600,
      iat: 1_787_400_000,
    });
  });

  it("rejects cookies after signing-secret rotation", async () => {
    const session = await issueSession(
      { accessVersion: 3 },
      { now, signingSecret, ttlSeconds: 3_600 },
    );

    await expect(
      verifySession(session.cookie.value, {
        now,
        signingSecret: otherSigningSecret,
      }),
    ).resolves.toBeNull();
  });

  it("rejects signed payloads that contain token or user data", async () => {
    const jwt = await new SignJWT({
      accessVersion: 3,
      rawToken: "test-token",
      userId: "single-user",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(new Date(now.getTime() + 3_600_000))
      .sign(new TextEncoder().encode(signingSecret));

    await expect(verifySession(jwt, { now, signingSecret })).resolves.toBeNull();
  });

  it("requires the cookie access version to match current settings", async () => {
    const session = await issueSession(
      { accessVersion: 3 },
      { now, signingSecret, ttlSeconds: 3_600 },
    );
    const cookieHeader = `${SESSION_COOKIE_NAME}=${session.cookie.value}`;

    await expect(
      requireWebSession(
        { cookieHeader },
        { currentAccessVersion: async () => 3, now, signingSecret },
      ),
    ).resolves.toMatchObject({ accessVersion: 3 });
    await expect(
      requireWebSession(
        { cookieHeader },
        { currentAccessVersion: async () => 4, now, signingSecret },
      ),
    ).rejects.toThrow("unauthorized");
  });
});

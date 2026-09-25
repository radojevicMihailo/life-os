import { describe, expect, it } from "vitest";
import { issueAccessSession, passwordMatches, verifyAccessSession } from "./access";

const password = "a-long-unique-access-password-for-tests";

describe("single-user access", () => {
  it("accepts only the configured password", () => {
    expect(passwordMatches(password, password)).toBe(true);
    expect(passwordMatches("wrong password", password)).toBe(false);
  });

  it("rejects a changed, expired, or old-password session", () => {
    const issuedAt = new Date("2026-09-25T10:00:00Z");
    const token = issueAccessSession(password, issuedAt);
    expect(verifyAccessSession(token, password, new Date("2026-09-26T10:00:00Z"))).toBe(true);
    expect(verifyAccessSession(`${token}x`, password, issuedAt)).toBe(false);
    expect(verifyAccessSession(token, "another-long-password-for-tests", issuedAt)).toBe(false);
    expect(verifyAccessSession(token, password, new Date("2026-10-26T10:00:00Z"))).toBe(false);
  });
});

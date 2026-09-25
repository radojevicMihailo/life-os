import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, issueAccessSession, verifyAccessSession } from "@/lib/access";
import { proxy } from "../proxy";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("renews a valid session so it survives its original expiry", () => {
  const password = "life-os-disposable-smoke-password-2026";
  const issuedAt = new Date("2026-09-01T10:00:00Z");
  const visitedAt = new Date("2026-09-25T10:00:00Z");
  vi.stubEnv("LIFE_OS_ACCESS_PASSWORD", password);
  vi.stubEnv("APP_ORIGIN", "https://life-os.example");
  vi.useFakeTimers();
  vi.setSystemTime(visitedAt);

  const oldToken = issueAccessSession(password, issuedAt);
  const request = new NextRequest("http://0.0.0.0:3000/plans", {
    headers: { cookie: `${ACCESS_COOKIE_NAME}=${oldToken}` },
  });
  const response = proxy(request);
  const renewedToken = response.cookies.get(ACCESS_COOKIE_NAME)?.value;

  expect(response.status).toBe(200);
  expect(renewedToken).toBeDefined();
  expect(response.headers.get("set-cookie")).toMatch(/Secure;.*HttpOnly|HttpOnly;.*Secure/);
  expect(verifyAccessSession(oldToken, password, new Date("2026-10-02T10:00:00Z"))).toBe(false);
  expect(verifyAccessSession(renewedToken, password, new Date("2026-10-02T10:00:00Z"))).toBe(true);
});

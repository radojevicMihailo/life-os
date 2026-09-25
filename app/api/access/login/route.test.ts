import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

it("sets a secure session for the public HTTPS origin behind a proxy", async () => {
  vi.stubEnv("APP_ORIGIN", "https://life-os.example");
  vi.stubEnv("LIFE_OS_ACCESS_PASSWORD", "life-os-disposable-smoke-password-2026");
  const request = new NextRequest("http://0.0.0.0:3000/api/access/login", {
    method: "POST",
    body: new URLSearchParams({ password: "life-os-disposable-smoke-password-2026" }),
  });

  const response = await POST(request);
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://life-os.example/");
  expect(response.headers.get("set-cookie")).toMatch(/Secure;.*HttpOnly|HttpOnly;.*Secure/);
});

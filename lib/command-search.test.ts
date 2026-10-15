import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, issueAccessSession } from "./access";
import { GET } from "@/app/api/search/route";

const search = vi.hoisted(() => vi.fn(async () => [{ id: "task-1", title: "Kupovina", href: "/tasks/task-1", kind: "Zadatak" }]));
vi.mock("@/lib/server-search", () => ({ searchApplication: search }));
afterEach(() => { vi.unstubAllEnvs(); search.mockClear(); });
const password = "search-disposable-password-2026";

it("denies search without a valid session and never reads private records", async () => {
  vi.stubEnv("LIFE_OS_ACCESS_PASSWORD", password);
  const response = await GET(new NextRequest("http://localhost/api/search?q=kupovina"));
  expect(response.status).toBe(401);
  expect(search).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});

it("returns bounded search results to an authenticated session without caching them", async () => {
  vi.stubEnv("LIFE_OS_ACCESS_PASSWORD", password);
  const request = new NextRequest("http://localhost/api/search?q=kupovina", { headers: { cookie: `${ACCESS_COOKIE_NAME}=${issueAccessSession(password)}` } });
  const response = await GET(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [{ id: "task-1", title: "Kupovina", href: "/tasks/task-1", kind: "Zadatak" }] });
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});

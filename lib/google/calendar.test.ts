import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = { GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", GOOGLE_REFRESH_TOKEN: "rt" };

function mockFetchOnce(body: unknown, init: { status?: number } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementationOnce(
    async () =>
      new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("google calendar client", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ENV);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;
  });

  it("isConfigured true when all three env vars set", async () => {
    const mod = await import("./calendar");
    expect(mod.isConfigured()).toBe(true);
  });

  it("isConfigured false when refresh token missing", async () => {
    delete process.env.GOOGLE_REFRESH_TOKEN;
    const mod = await import("./calendar");
    expect(mod.isConfigured()).toBe(false);
  });

  it("getAccessToken posts refresh grant and returns access_token", async () => {
    const spy = mockFetchOnce({ access_token: "AT", expires_in: 3600 });
    const mod = await import("./calendar");
    const token = await mod.getAccessToken();
    expect(token).toBe("AT");
    expect(spy).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getAccessToken throws GoogleAuthError on 4xx", async () => {
    mockFetchOnce({ error: "invalid_grant" }, { status: 400 });
    const mod = await import("./calendar");
    await expect(mod.getAccessToken()).rejects.toMatchObject({ name: "GoogleAuthError" });
  });

  it("listCalendars maps response items", async () => {
    mockFetchOnce({ access_token: "AT", expires_in: 3600 });
    mockFetchOnce({
      items: [
        { id: "a@g.com", summary: "A", primary: true },
        { id: "b@g.com", summary: "B" },
      ],
    });
    const mod = await import("./calendar");
    const cals = await mod.listCalendars();
    expect(cals).toEqual([
      { id: "a@g.com", summary: "A", primary: true },
      { id: "b@g.com", summary: "B", primary: false },
    ]);
  });

  it("listEvents passes timeMin/timeMax/singleEvents", async () => {
    mockFetchOnce({ access_token: "AT", expires_in: 3600 });
    const eventsSpy = mockFetchOnce({ items: [] });
    const mod = await import("./calendar");
    await mod.listEvents("cal1", "2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z");
    const url = eventsSpy.mock.calls[0]![0] as string;
    expect(url).toContain("/calendars/cal1/events");
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("orderBy=startTime");
    expect(url).toContain(encodeURIComponent("2026-06-01T00:00:00.000Z"));
  });
});

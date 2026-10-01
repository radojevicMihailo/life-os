import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, issueAccessSession } from "@/lib/access";
import { createPushHandlers } from "./api";
import type { PushDevice, PushStore } from "./types";
const password = "life-os-test-password-at-least-24-chars";
const input = { endpoint: "https://web.push.apple.com/token", keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString("base64url"), auth: Buffer.alloc(16, 2).toString("base64url") } };
const config = { publicKey: "public", privateKey: "private", subject: "mailto:user@example.com" };
function request(method: string, body?: unknown, origin = "https://life-os.example", authenticated = true) {
  vi.stubEnv("APP_ORIGIN", "https://life-os.example");
  vi.stubEnv("LIFE_OS_ACCESS_PASSWORD", password);
  return new NextRequest("https://life-os.example/api/push", {
    method, headers: { origin, cookie: authenticated ? `${ACCESS_COOKIE_NAME}=${issueAccessSession(password)}` : "", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function fixture() {
  let registered: PushDevice | null = null;
  let delivered = 0;
  const store = {
    async upsertDevice(value: typeof input, vapidPublicKey: string) { registered = { ...value, id: "phone", vapidPublicKey }; },
    async findDevice(endpoint: string) { return registered?.endpoint === endpoint ? registered : null; },
    async removeEndpoint() { registered = null; }, async removeDevice() { registered = null; },
  } as unknown as PushStore;
  return { handlers: createPushHandlers(config, store, async () => { delivered++; }), getRegistered: () => registered, getDelivered: () => delivered };
}
afterEach(() => vi.unstubAllEnvs());
describe("push API", () => {
  it("rejects unauthenticated and cross-origin changes", async () => {
    const { handlers, getRegistered } = fixture();
    expect((await handlers.subscribe(request("POST", input, "https://life-os.example", false))).status).toBe(401);
    expect((await handlers.subscribe(request("POST", input, "https://attacker.example"))).status).toBe(403);
    expect((await handlers.subscribe(request("POST", input, ""))).status).toBe(403);
    expect(getRegistered()).toBeNull();
  });
  it("registers a device, sends a real transport test for that device, and removes it", async () => {
    const { handlers, getRegistered, getDelivered } = fixture();
    expect((await handlers.subscribe(request("POST", input))).status).toBe(200);
    expect(getRegistered()?.endpoint).toBe(input.endpoint);
    expect((await handlers.test(request("POST", { endpoint: input.endpoint }))).status).toBe(200);
    expect(getDelivered()).toBe(1);
    expect((await handlers.unsubscribe(request("DELETE", { endpoint: input.endpoint }))).status).toBe(200);
    expect(getRegistered()).toBeNull();
    expect((await handlers.test(request("POST", { endpoint: input.endpoint }))).status).toBe(404);
  });
  it("does not expose private VAPID material", async () => {
    const { handlers } = fixture();
    const result = await handlers.config(request("GET"));
    expect(await result.json()).toEqual({ configured: true, publicKey: "public" });
  });
  it("rejects malformed subscriptions and oversized bodies", async () => {
    const { handlers, getRegistered } = fixture();
    expect((await handlers.subscribe(request("POST", { ...input, endpoint: "https://127.0.0.1/private" }))).status).toBe(400);
    expect((await handlers.subscribe(request("POST", { ...input, extra: "a".repeat(9000) }))).status).toBe(413);
    expect(getRegistered()).toBeNull();
  });
  it("reports disabled server configuration without accepting subscriptions", async () => {
    const handlers = createPushHandlers(null, {} as PushStore, async () => {});
    expect(await (await handlers.config(request("GET"))).json()).toEqual({ configured: false, publicKey: null });
    expect((await handlers.subscribe(request("POST", input))).status).toBe(503);
  });
});

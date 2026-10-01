import { describe, expect, it } from "vitest";
import { subscriptionSchema } from "./validation";

const subscription = {
  endpoint: "https://web.push.apple.com/token",
  keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString("base64url"), auth: Buffer.alloc(16, 2).toString("base64url") },
};
describe("push subscription validation", () => {
  it("accepts Apple, Chrome and Firefox subscriptions", () => {
    for (const host of ["web.push.apple.com", "fcm.googleapis.com", "updates.push.services.mozilla.com"]) {
      expect(subscriptionSchema.safeParse({ ...subscription, endpoint: `https://${host}/token` }).success).toBe(true);
    }
  });
  it("rejects endpoints that could send private payloads outside a push provider", () => {
    for (const endpoint of ["http://web.push.apple.com/token", "https://localhost/token", "https://127.0.0.1/token", "https://web.push.apple.com.attacker.example/token", "https://user@web.push.apple.com/token", "https://web.push.apple.com:8443/token", "https://web.push.apple.com/token#fragment"]) {
      expect(subscriptionSchema.safeParse({ ...subscription, endpoint }).success, endpoint).toBe(false);
    }
  });
  it("rejects malformed encryption keys", () => {
    expect(subscriptionSchema.safeParse({ ...subscription, keys: { ...subscription.keys, auth: "short" } }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ ...subscription, keys: { ...subscription.keys, p256dh: Buffer.alloc(65).toString("base64url") } }).success).toBe(false);
  });
});

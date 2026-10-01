import { describe, expect, it } from "vitest";
import { dispatchReminders } from "./delivery";
import type { PushDevice, PushStore, Reminder } from "./types";

const reminder: Reminder = { key: "task:a", title: "Call", startsAt: new Date("2026-10-01T10:30:00Z"), type: "task", url: "/tasks/a" };
const device = (id: string): PushDevice => ({ id, endpoint: `https://web.push.apple.com/${id}`, keys: { p256dh: "key", auth: "auth" }, vapidPublicKey: "public" });
function memoryStore(devices: PushDevice[]) {
  const claims = new Set<string>();
  const successful = new Set<string>();
  const store = {
    devices,
    async listDevices() { return this.devices; },
    async claim(id: string, item: Reminder, lead: number) { const key = `${id}:${item.key}:${lead}`; if (claims.has(key)) return false; claims.add(key); return true; },
    async complete(id: string, item: Reminder, lead: number) { successful.add(`${id}:${item.key}:${lead}`); },
    async release(id: string, item: Reminder, lead: number) { claims.delete(`${id}:${item.key}:${lead}`); },
    async retryLead() { return null; },
    async removeDevice(id: string) { this.devices = this.devices.filter((d) => d.id !== id); },
  };
  return { store: store as unknown as PushStore, successful, devices: store };
}
describe("per-device reminder delivery", () => {
  it("sends to both devices independently and suppresses successful repeat ticks", async () => {
    const { store, successful } = memoryStore([device("mac"), device("phone")]);
    const accepted: string[] = [];
    const send = async (d: PushDevice) => { accepted.push(d.id); };
    const now = new Date("2026-10-01T10:00:00Z");
    await dispatchReminders(store, send, [reminder], now);
    await dispatchReminders(store, send, [reminder], now);
    expect(accepted).toEqual(["mac", "phone"]);
    expect(successful.size).toBe(2);
  });
  it("retries temporary failures without resending to a successful device", async () => {
    const { store, successful } = memoryStore([device("mac"), device("phone")]);
    const accepted: string[] = [];
    let phoneFails = true;
    const send = async (d: PushDevice) => { if (d.id === "phone" && phoneFails) throw { statusCode: 503 }; accepted.push(d.id); };
    await dispatchReminders(store, send, [reminder], new Date("2026-10-01T10:00:00Z"));
    phoneFails = false;
    await dispatchReminders(store, send, [reminder], new Date("2026-10-01T10:01:00Z"));
    expect(accepted).toEqual(["mac", "phone"]);
    expect(successful.size).toBe(2);
  });
  it("removes expired subscriptions and still delivers to the other device", async () => {
    for (const statusCode of [404, 410]) {
      const { store, devices, successful } = memoryStore([device("mac"), device("phone")]);
      await dispatchReminders(store, async (d) => { if (d.id === "mac") throw { statusCode }; }, [reminder], new Date("2026-10-01T10:00:00Z"));
      expect(devices.devices.map((d) => d.id)).toEqual(["phone"]);
      expect(successful.size).toBe(1);
    }
  });
  it("does not send early, stale or already-started reminders", async () => {
    const { store, successful } = memoryStore([device("phone")]);
    for (const time of ["09:59:00", "10:04:00", "10:30:00", "10:31:00"]) {
      await dispatchReminders(store, async () => {}, [reminder], new Date(`2026-10-01T${time}Z`));
    }
    expect(successful.size).toBe(0);
  });
  it("refreshes the clock for each device and skips an event that started while the first device was sending", async () => {
    const { store, successful } = memoryStore([device("mac"), device("phone")]);
    const accepted: string[] = [];
    let now = new Date("2026-10-01T10:25:00Z");
    await dispatchReminders(store, async (d) => {
      accepted.push(d.id);
      now = new Date("2026-10-01T10:31:00Z");
    }, [reminder], () => now);
    expect(accepted).toEqual(["mac"]);
    expect(successful.size).toBe(1);
  });
  it("recovers an interrupted claim beyond its original window while the event is still upcoming", async () => {
    const { store, successful } = memoryStore([device("phone")]);
    store.retryLead = async () => 30;
    await dispatchReminders(store, async () => {}, [reminder], new Date("2026-10-01T10:04:00Z"));
    expect(successful.size).toBe(1);
  });

});

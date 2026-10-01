import type { PushDevice, PushPayload, PushSender, PushStore, Reminder } from "./types";

export function pushStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
}
export async function sendToDevice(store: PushStore, send: PushSender, device: PushDevice, payload: PushPayload, ttl?: number) {
  try {
    await send(device, payload, ttl);
    return "sent" as const;
  } catch (error) {
    const status = pushStatus(error);
    if (status === 404 || status === 410) {
      await store.removeDevice(device.id);
      return "expired" as const;
    }
    // Provider errors can contain endpoint secrets; never log the full error.
    console.error("[push] delivery failed", { status: status ?? "network" });
    return "failed" as const;
  }
}
const clock = new Intl.DateTimeFormat("sr-Latn", { timeZone: "Europe/Belgrade", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export async function dispatchReminders(store: PushStore, send: PushSender, reminders: Reminder[], now: Date | (() => Date), devices?: PushDevice[]) {
  const clockNow = typeof now === "function" ? now : () => now;
  const targets = devices ?? await store.listDevices();
  const expired = new Set<string>();
  let sent = 0;
  for (const item of reminders) {
    for (const device of targets) {
      if (expired.has(device.id)) continue;
      let minutes = (item.startsAt.getTime() - clockNow().getTime()) / 60000;
      if (!Number.isFinite(minutes) || minutes <= 0) continue;
      const dueLead = [30, 15, 5].find((value) => minutes <= value && minutes > value - 3);
      // Interrupted sends retain their lease and can recover after the original window.
      const lead = (await store.retryLead(device.id, item)) ?? dueLead;
      if (lead === undefined || !(await store.claim(device.id, item, lead))) continue;
      minutes = (item.startsAt.getTime() - clockNow().getTime()) / 60000;
      if (minutes <= 0) { await store.release(device.id, item, lead); continue; }
      const label = item.type === "due" ? "Rok zadatka" : item.type === "google" ? "Događaj" : "Zadatak";
      const payload: PushPayload = {
        title: `Life OS · ${label} za ${Math.ceil(minutes)} min`,
        body: `${item.title.slice(0, 300)} — ${clock.format(item.startsAt)}`,
        url: item.url,
        tag: `${item.key}:${item.startsAt.toISOString()}:${lead}`,
      };
      const outcome = await sendToDevice(store, send, device, payload, Math.max(1, Math.floor(minutes * 60)));
      if (outcome === "sent") { await store.complete(device.id, item, lead); sent++; }
      else if (outcome === "expired") expired.add(device.id);
      else await store.release(device.id, item, lead);
    }
  }
  return sent;
}

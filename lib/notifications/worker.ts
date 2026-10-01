import "server-only";
import { pool } from "@/db/pool";
import { getVapidConfig } from "./config";
import { pushStore, sendPush } from "./server";
import { dispatchReminders } from "./delivery";
import { collectReminders } from "./sources";
import { startReminderScheduler } from "./scheduler";
const runtime = globalThis as typeof globalThis & { lifeOsPushStop?: () => void };
export function startPushWorker() {
  if (runtime.lifeOsPushStop || !getVapidConfig()) return;
  runtime.lifeOsPushStop = startReminderScheduler(async () => {
    const config = getVapidConfig();
    if (!config) return;
    const devices = await pushStore.listDevices(config.publicKey);
    await pushStore.prune();
    if (devices.length === 0) return;
    const reminders = await collectReminders(pool, new Date());
    // Re-read the clock after external requests; never send a reminder for an event already started.
    const sent = await dispatchReminders(pushStore, sendPush, reminders, () => new Date(), devices);
    if (sent > 0) console.log("[push] reminders accepted by provider", { sent });
  });
  console.log("[push] reminder scheduler started");
}

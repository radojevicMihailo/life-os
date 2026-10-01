import "server-only";
import webpush from "web-push";
import { pool } from "@/db/pool";
import { getVapidConfig } from "./config";
import { createPushHandlers } from "./api";
import { PgPushStore } from "./store";
import type { PushSender } from "./types";
export const pushStore = new PgPushStore(pool);
export const sendPush: PushSender = async (device, payload, ttl = 180) => {
  const config = getVapidConfig();
  if (!config) throw new Error("Push not configured");
  await webpush.sendNotification(device, JSON.stringify(payload), {
    vapidDetails: config, TTL: ttl, timeout: 10000, urgency: "high",
  });
};
export function pushHandlers() { return createPushHandlers(getVapidConfig(), pushStore, sendPush); }

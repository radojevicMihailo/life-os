#!/usr/bin/env node
// Discover your Telegram chat_id.
// Usage:
//   1. Create bot via @BotFather, copy token.
//   2. Send any message to your bot from your account.
//   3. TELEGRAM_BOT_TOKEN=xxx node scripts/telegram-setup.mjs
//      (or put TELEGRAM_BOT_TOKEN in .env.local first)
// Prints chat_id(s) from recent updates.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.local");
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN first (in .env.local or env).");
  process.exit(1);
}

// Verify token + show bot identity so you know you're messaging the right one.
const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
const me = await meRes.json();
if (!me.ok) {
  console.error("Token rejected:", me);
  process.exit(1);
}
console.log(`Bot: @${me.result.username} (id ${me.result.id})`);

// Check webhook — if set, getUpdates returns empty.
const whRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const wh = await whRes.json();
if (wh.ok && wh.result.url) {
  console.log(`Webhook active (${wh.result.url}) — deleting so getUpdates works...`);
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-10`);
const data = await res.json();
if (!data.ok) {
  console.error("Telegram error:", data);
  process.exit(1);
}
if (!data.result.length) {
  console.log(
    "No updates. Make sure you:\n" +
      `  - searched for @${me.result.username} (exact bot you made token for)\n` +
      "  - hit Start, then sent a message in last ~24h\n" +
      "Then re-run.",
  );
  process.exit(0);
}
const ids = new Set();
for (const u of data.result) {
  const chat = u.message?.chat ?? u.edited_message?.chat ?? u.channel_post?.chat;
  if (chat) ids.add(`${chat.id} (${chat.type}${chat.username ? " @" + chat.username : ""})`);
}
console.log("Chat IDs seen:");
for (const id of ids) console.log("  " + id);
console.log("\nAdd to .env.local: TELEGRAM_CHAT_ID=<id>");

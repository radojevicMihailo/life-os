#!/usr/bin/env node
// Notify upcoming tasks via macOS notification + Telegram bot.
// Fires once per task when `action_at` is within the lead window.
// Dedupe state lives in the Postgres `notif_sent` table so the job can run
// from CI (GitHub Actions) where local file state would not persist.
//
// Env:
//   DATABASE_URL              required
//   TELEGRAM_BOT_TOKEN        required for Telegram delivery
//   TELEGRAM_CHAT_ID          required for Telegram delivery
//   NOTIFY_LEAD_MINUTES       comma list, default "30,15,5" — one notification per lead
//   NOTIFY_WINDOW_MINUTES     half-width of fire window per lead (default 3)
//                             Must be ≥ half the cron cadence so no tick is missed.
//   NOTIFY_DISABLE_MACOS=1    skip macOS notification (set in CI)
//   NOTIFY_DISABLE_TELEGRAM=1 skip Telegram

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Pool } from "pg";

const ENV_PATH = path.join(process.cwd(), ".env.local");
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    if (process.env[k]) continue;
    const v = vRaw.replace(/^["']|["']$/g, "");
    process.env[k] = v;
  }
}

const LEADS = (process.env.NOTIFY_LEAD_MINUTES ?? "30,15,5")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
  .sort((a, b) => b - a);
const WINDOW_MIN = Number(process.env.NOTIFY_WINDOW_MINUTES ?? 3);
const MAX_LEAD = LEADS[0] ?? 30;

function macosNotify(title, body) {
  if (process.env.NOTIFY_DISABLE_MACOS === "1") return;
  if (process.platform !== "darwin") return;
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `display notification "${esc(body)}" with title "${esc(title)}" sound name "Glass"`;
  try {
    execFileSync("osascript", ["-e", script]);
  } catch (e) {
    console.error("macOS notify failed:", e.message);
  }
}

async function telegramNotify(text) {
  if (process.env.NOTIFY_DISABLE_TELEGRAM === "1") return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    if (!res.ok) console.error("Telegram failed:", res.status, await res.text());
  } catch (e) {
    console.error("Telegram error:", e.message);
  }
}

function formatTime(d) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Record a fired notification. Returns true if this is the first time (we
// should notify), false if a row already existed (already sent — skip).
async function claim(pool, taskId, actionAt, lead) {
  const { rowCount } = await pool.query(
    `INSERT INTO notif_sent (task_id, action_at, lead)
     VALUES ($1, $2, $3)
     ON CONFLICT (task_id, action_at, lead) DO NOTHING`,
    [taskId, actionAt.toISOString(), String(lead)],
  );
  return rowCount > 0;
}

async function main() {
  const cs = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/lifeos";
  const pool = new Pool({ connectionString: cs });

  // Drop ledger rows for tasks already in the past — keeps the table small.
  await pool.query(`DELETE FROM notif_sent WHERE action_at < now() - interval '1 day'`);

  const now = new Date();

  const { rows } = await pool.query(
    `SELECT id, title, action_at
       FROM tasks
      WHERE action_at IS NOT NULL
        AND status NOT IN ('done','canceled')
        AND action_at > now()
        AND action_at <= now() + ($1 || ' minutes')::interval`,
    [String(MAX_LEAD + WINDOW_MIN)],
  );

  let sent = 0;
  for (const row of rows) {
    const actionAt = new Date(row.action_at);
    const deltaMs = actionAt.getTime() - now.getTime();
    const deltaMin = deltaMs / 60000;
    for (const lead of LEADS) {
      if (Math.abs(deltaMin - lead) > WINDOW_MIN) continue;
      // Atomically claim this (task, action_at, lead) — skip if already sent.
      if (!(await claim(pool, row.id, actionAt, lead))) continue;

      const title = `Task in ${lead} min`;
      const body = `${row.title} — ${formatTime(actionAt)}`;
      const tgText = `*${row.title}*\nstarts in ${lead} min (${formatTime(actionAt)})`;

      macosNotify(title, body);
      await telegramNotify(tgText);

      sent++;
      break;
    }
  }

  await pool.end();
  console.log(`checked ${rows.length} task(s), notified ${sent}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

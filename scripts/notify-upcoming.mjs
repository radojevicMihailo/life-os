#!/usr/bin/env node
// Local macOS reminders for timed tasks and selected Google calendar events.
// The notif_sent table deduplicates reminders across local runs.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const ENV_PATH = path.join(process.cwd(), ".env.local");
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

const LEADS = (process.env.NOTIFY_LEAD_MINUTES ?? "30,15,5")
  .split(",").map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0)
  .sort((a, b) => b - a);
const WINDOW_MIN = Number(process.env.NOTIFY_WINDOW_MINUTES ?? 3);
const MAX_LEAD = LEADS[0] ?? 30;
const TIME_ZONE = "Europe/Belgrade";
const localTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function hasTime(date) {
  // Date-only task inputs are stored at local midnight, as in the calendar view.
  return localTime.format(date) !== "00:00:00";
}

function formatTime(date) {
  return localTime.format(date).slice(0, 5);
}

function macosNotify(title, body) {
  if (process.env.NOTIFY_DISABLE_MACOS === "1" || process.platform !== "darwin") return false;
  const esc = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  try {
    execFileSync("osascript", ["-e", `display notification "${esc(body)}" with title "${esc(title)}" sound name "Glass"`]);
    return true;
  } catch (error) {
    console.error("macOS notify failed:", error.message);
    return false;
  }
}

async function claim(pool, key, startsAt, lead) {
  const { rowCount } = await pool.query(
    `INSERT INTO notif_sent (task_id, action_at, lead)
     VALUES ($1, $2, $3)
     ON CONFLICT (task_id, action_at, lead) DO NOTHING`,
    [key, startsAt.toISOString(), String(lead)],
  );
  return rowCount > 0;
}

export async function taskCandidates(pool, now, horizon) {
  const { rows } = await pool.query(
    `SELECT id, title, action_at, due_at FROM tasks
     WHERE status NOT IN ('done', 'canceled')
       AND ((action_at > $1 AND action_at <= $2)
         OR (due_at > $1 AND due_at <= $2))`,
    [now, horizon],
  );
  const candidates = [];
  for (const row of rows) {
    const actionAt = row.action_at ? new Date(row.action_at) : null;
    const dueAt = row.due_at ? new Date(row.due_at) : null;
    if (actionAt && actionAt > now && actionAt <= horizon && hasTime(actionAt)) {
      candidates.push({ key: row.id, title: row.title, startsAt: actionAt, type: "task" });
    }
    if (dueAt && dueAt > now && dueAt <= horizon && hasTime(dueAt)
      && (!actionAt || dueAt.getTime() !== actionAt.getTime())) {
      candidates.push({ key: `due:${row.id}`, title: row.title, startsAt: dueAt, type: "due" });
    }
  }
  return candidates;
}

function refreshTokens() {
  const multi = process.env.GOOGLE_REFRESH_TOKENS;
  if (multi) return multi.split(",").map((token) => token.trim()).filter(Boolean);
  return process.env.GOOGLE_REFRESH_TOKEN ? [process.env.GOOGLE_REFRESH_TOKEN] : [];
}

function calendarTarget(raw) {
  const match = /^(\d+):(.+)$/.exec(raw);
  return match ? { accountIdx: Number(match[1]), calendarId: match[2] }
    : { accountIdx: 0, calendarId: raw };
}

async function googleAccessToken(refreshToken) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Google token refresh failed: ${response.status}`);
  const body = await response.json();
  return body.access_token;
}

export async function googleCandidates(pool, now, horizon) {
  const tokens = refreshTokens();
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || tokens.length === 0) return [];
  const { rows } = await pool.query("SELECT google_calendar_ids FROM app_settings WHERE id = 1");
  const selected = [...new Set(rows[0]?.google_calendar_ids ?? [])];
  const accessTokens = new Map();
  const candidates = [];
  for (const raw of selected) {
    const { accountIdx, calendarId } = calendarTarget(raw);
    if (!tokens[accountIdx]) continue;
    try {
      if (!accessTokens.has(accountIdx)) {
        accessTokens.set(accountIdx, await googleAccessToken(tokens[accountIdx]));
      }
      const query = new URLSearchParams({
        singleEvents: "true", orderBy: "startTime", maxResults: "2500",
        timeMin: now.toISOString(), timeMax: horizon.toISOString(),
      });
      let pageToken;
      do {
        if (pageToken) query.set("pageToken", pageToken);
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query}`, {
          headers: { authorization: `Bearer ${accessTokens.get(accountIdx)}` },
        });
        if (!response.ok) throw new Error(`Google Calendar request failed: ${response.status}`);
        const page = await response.json();
        for (const event of page.items ?? []) {
          if (!event.start?.dateTime || event.status === "cancelled") continue;
          const startsAt = new Date(event.start.dateTime);
          if (Number.isNaN(startsAt.getTime()) || startsAt <= now || startsAt > horizon) continue;
          candidates.push({
            key: `google:${accountIdx}:${calendarId}:${event.id}`,
            title: event.summary ?? "Događaj iz Google kalendara",
            startsAt,
            type: "google",
          });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
    } catch (error) {
      console.error(`Google calendar ${accountIdx}:${calendarId} reminders failed:`, error.message);
    }
  }
  return candidates;
}

export async function main() {
  const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/lifeos";
  const pool = new Pool({ connectionString });
  try {
    await pool.query("DELETE FROM notif_sent WHERE action_at < now() - interval '1 day'");
    const now = new Date();
    const horizon = new Date(now.getTime() + (MAX_LEAD + WINDOW_MIN) * 60_000);
    const [tasks, google] = await Promise.all([
      taskCandidates(pool, now, horizon),
      googleCandidates(pool, now, horizon),
    ]);
    let sent = 0;
    for (const item of [...tasks, ...google]) {
      const deltaMinutes = (item.startsAt.getTime() - now.getTime()) / 60_000;
      for (const lead of LEADS) {
        if (Math.abs(deltaMinutes - lead) > WINDOW_MIN) continue;
        if (!(await claim(pool, item.key, item.startsAt, lead))) continue;
        const label = item.type === "google" ? "Događaj" : item.type === "due" ? "Rok zadatka" : "Zadatak";
        const message = `${item.title} — ${formatTime(item.startsAt)} (za ${lead} min)`;
        const macSent = macosNotify(`${label} za ${lead} min`, message);
        if (!macSent) {
          await pool.query("DELETE FROM notif_sent WHERE task_id = $1 AND action_at = $2 AND lead = $3", [
            item.key, item.startsAt.toISOString(), String(lead),
          ]);
        } else {
          sent++;
        }
        break;
      }
    }
    console.log(`checked ${tasks.length} task time(s) and ${google.length} Google event(s), notified ${sent}`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
// One-time helper: produce a refresh token for read-only Google Calendar access.
// Usage: pnpm google:oauth
// Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET from .env.local (or env).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const REDIRECT = "http://localhost:3000/oauth2callback";

function loadDotEnv() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

async function main() {
  loadDotEnv();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in env.");
    process.exit(1);
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n1. Open this URL in your browser:\n");
  console.log(authUrl.toString());
  console.log(
    "\n2. After consenting you'll be redirected to a localhost URL that fails to load.",
  );
  console.log("3. Copy the FULL redirected URL from the address bar and paste it below.\n");

  const rl = readline.createInterface({ input, output });
  const pasted = (await rl.question("Pasted URL: ")).trim();
  rl.close();

  let code;
  try {
    code = new URL(pasted).searchParams.get("code");
  } catch {
    code = pasted;
  }
  if (!code) {
    console.error("Could not extract code from input.");
    process.exit(1);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("Token exchange failed:", res.status, await res.text());
    process.exit(1);
  }
  const json = await res.json();
  if (!json.refresh_token) {
    console.error(
      "No refresh_token in response. Revoke prior consent at https://myaccount.google.com/permissions and retry.",
    );
    process.exit(1);
  }
  console.log("\nAdd this to .env.local then restart the dev server:\n");
  console.log(`GOOGLE_REFRESH_TOKEN=${json.refresh_token}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

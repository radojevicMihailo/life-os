#!/usr/bin/env node
// Generate stable VAPID credentials into a git-ignored local env file.
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import webpush from "web-push";
const args = process.argv.slice(2);
const argument = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const file = argument("--file") ?? ".env.local";
const source = existsSync(file) ? readFileSync(file, "utf8") : "";
const value = (name) => source.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^\\r\\n"']+)`, "m"))?.[1];
const hasPublic = !!value("WEB_PUSH_VAPID_PUBLIC_KEY");
const hasPrivate = !!value("WEB_PUSH_VAPID_PRIVATE_KEY");
if (hasPublic || hasPrivate) {
  if (!hasPublic || !hasPrivate || !value("WEB_PUSH_VAPID_SUBJECT")) throw new Error("Incomplete VAPID config; repair it without rotating existing keys.");
  console.log("VAPID configuration already exists; existing keys preserved.");
} else {
  const subject = argument("--subject") ?? process.env.WEB_PUSH_VAPID_SUBJECT;
  if (!subject) throw new Error("Usage: pnpm notify:setup --subject mailto:you@example.com");
  const keys = webpush.generateVAPIDKeys();
  webpush.getVapidHeaders("https://web.push.apple.com", subject, keys.publicKey, keys.privateKey, "aes128gcm");
  writeFileSync(file, `${source}${source.endsWith("\n") || !source ? "" : "\n"}WEB_PUSH_VAPID_PUBLIC_KEY=${keys.publicKey}\nWEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}\nWEB_PUSH_VAPID_SUBJECT=${subject}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(`VAPID configuration saved in ${file}. Keys were not printed; keep this file private.`);
}

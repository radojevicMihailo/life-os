# Life OS notifications

Life OS uses Web Push directly, without Telegram or GitHub scheduled workflows. Notifications are enabled separately in each browser/installed app, using `/notifications` (also linked from the task navigation). A running Fly Machine checks timed tasks and selected Google calendars every minute in the existing Next.js process. No additional Node process is started.

## Activate the server

Generate one stable VAPID key pair locally:

```sh
pnpm notify:setup --subject mailto:YOUR_EMAIL
```

This adds the public key, private key and contact subject to the ignored `.env.local`, without printing the keys. Re-running preserves existing credentials. Do not regenerate the keys on every deployment: rotating them requires subscribing again on each device. Use a real `mailto:` contact; Safari rejects a `https://localhost` VAPID subject.

Copy only these three values to Fly secrets. This pipeline keeps the credentials out of command arguments and terminal output; replace the app name with your actual Fly app:

```sh
node --env-file=.env.local --input-type=module -e 'for (const key of ["WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT"]) { if (!process.env[key]) throw new Error(`${key} missing`); process.stdout.write(`${key}=${process.env[key]}\n`); }' | fly secrets import --stage --app YOUR_APP
fly deploy --app YOUR_APP --ha=false --strategy immediate
```

The image startup applies the additive `0004_web_push.sql` migration. `fly.toml` enables the in-process reminder scheduler and keeps the single Machine running. Normal local development and production builds do not schedule sends; set `PUSH_REMINDERS_ENABLED=1` explicitly if testing the scheduler locally. Missing/invalid VAPID configuration disables the worker and produces a clear message in the UI.

The existing 256 MB Machine is tight: an earlier diagnostic run with a separate Node process caused an OOM restart. This implementation shares the server process/pool and sends sequentially, but physical-device rollout must still check real memory usage. If normal usage causes OOM, increase to 512 MB rather than silently losing reminders. Do not scale to multiple Machines with independent database volumes.

## Enable each device

On iPhone/iPad (iOS/iPadOS 16.4 or later), open the deployed HTTPS app, choose Share → Add to Home Screen, launch Life OS through that icon, sign in, open Notifikacije and tap **Uključi notifikacije**. Accept the system permission prompt. An ordinary iPhone browser tab cannot subscribe.

On MacBook, sign in through a supported Safari (macOS Ventura/Safari 16.1 or later), Chrome or Firefox browser, open Notifikacije and tap **Uključi notifikacije**. Accept permission for the site. Installation is not necessary for desktop browser push.

Use **Pošalji test** on each device. The button sends through the actual Web Push provider, not a locally simulated notification. Provider acceptance does not prove the system displayed a banner: check Life OS/browser notification settings and Focus mode when needed. **Isključi notifikacije** removes only that device's subscription. Expired subscriptions (404/410) are removed; the UI asks to enable again. Browsers using a different provider than Apple, Google or Mozilla are not supported by the endpoint allowlist.

## Reminder behavior

Timed task action/due dates and selected timed Google events receive reminders at 30, 10 and 1 minute. Date-only items, done/canceled tasks, canceled events and all-day events are skipped. A three-minute late window tolerates normal scheduler delays; the final reminder can only be sent before the event starts. Delivery success is recorded separately per device, so receiving on the Mac cannot suppress the iPhone reminder. Failed sends retry while the normal window remains open; interrupted claims recover after 30 seconds, including after the normal window while the event is still upcoming. No catch-up message is sent after an event starts. Notifications expire at event start at the push provider.

Delivery is at least once: a crash after the provider accepts a message but before PostgreSQL records success may cause a duplicate. The stable notification tag groups replacements. Offline devices may miss a reminder if they reconnect after its expiry. If the Fly Machine is stopped, no checks occur until it starts; it therefore remains always on for this rollout.

## Verification

Automated checks cover validation/authentication, independent-device delivery, temporary/expired failures, restart lease recovery, changing clock during a slow batch, task/Google source filtering, service-worker display/click behavior and phone-width controls. Browser tests simulate the external browser push provider; they do not prove delivery on a physical iPhone.

```sh
pnpm test
node --env-file=.env.local --import tsx tests/notifications/store-smoke.mts
# Against a locally running app with VAPID configured and test access password:
LIFE_OS_E2E_CHANNEL=chrome pnpm exec playwright test tests/e2e/notifications.spec.ts --workers=1
```

The database smoke test creates/removes its own disposable database and requires local database creation permission. Verify a physical MacBook and iPhone after deployment: test each device, create a future timed task, close the app, verify reminders arrive independently, disable one device and verify the other keeps receiving. Check `fly logs --app YOUR_APP` for `[push]` entries and monitor memory without adding a diagnostic Node process to the 256 MB Machine. Logs never print subscription endpoints, encryption keys or full provider errors.

References: [Apple Web Push on iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [web-push transport](https://github.com/web-push-libs/web-push).

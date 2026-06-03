# Google Calendar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull events from Google Calendar (read-only) and show them in the existing tasks `CalendarView` alongside tasks.

**Architecture:** Single-user OAuth bootstrap via a Node script; refresh token in `.env.local`. On every render of `/calendar`, server fetches selected calendars' events in parallel via `fetch` (no SDK). Selected calendar IDs persisted in a singleton `app_settings` Postgres row. `CalendarItem` extended with `source: "task" | "google"`; Google events render as muted slate chips.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM, Postgres, zod, sonner, shadcn/ui, vitest.

Spec: `docs/superpowers/specs/2026-06-03-google-calendar-integration-design.md`.

---

## File Structure

New files:
- `scripts/google-oauth.mjs` — one-time OAuth helper.
- `lib/google/calendar.ts` — token refresh + Google REST wrappers (server-only).
- `lib/google/errors.ts` — `GoogleAuthError`, `GoogleFetchError`.
- `lib/google/calendar.test.ts` — vitest unit tests for the client.
- `db/schema/settings.ts` — Drizzle schema for `app_settings`.
- `db/migrations/0010_app_settings.sql` — singleton settings table migration.
- `lib/queries/settings.ts` — get/set selected calendar IDs.
- `app/(tasks)/_actions/google.ts` — server actions.
- `app/(tasks)/_actions/google.test.ts` — vitest tests for fan-out + error mapping.
- `app/(tasks)/_components/GoogleCalendarButton.tsx` — client component (popover + dialog).
- `.env.local.example` — documents new env vars.

Modified files:
- `app/(tasks)/_components/CalendarView.tsx` — extend `CalendarItem`, render gcal chips, accept toolbar `slot`.
- `app/(tasks)/calendar/page.tsx` — parallel fetch + merge.
- `db/index.ts` — register settings schema.
- `package.json` — add `google:oauth` script.
- `scripts/db-apply.mjs` — no edit; `0010` is new so it auto-runs.

---

## Task 1: Settings table migration + Drizzle schema

**Files:**
- Create: `db/migrations/0010_app_settings.sql`
- Create: `db/schema/settings.ts`
- Modify: `db/index.ts`

- [ ] **Step 1: Create migration SQL**

`db/migrations/0010_app_settings.sql`:

```sql
create table if not exists app_settings (
  id smallint primary key default 1 check (id = 1),
  google_calendar_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into app_settings (id) values (1) on conflict do nothing;
```

- [ ] **Step 2: Apply migration**

Run: `pnpm db:up && pnpm db:apply`
Expected: `applied 0010_app_settings.sql` in stdout.

- [ ] **Step 3: Verify in psql**

Run: `docker compose exec -T db psql -U postgres -d lifeos -c "select * from app_settings;"`
Expected: one row `id=1, google_calendar_ids={}`.

- [ ] **Step 4: Create Drizzle schema**

`db/schema/settings.ts`:

```ts
import { pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appSettings = pgTable("app_settings", {
  id: smallint("id").primaryKey().default(1),
  googleCalendarIds: text("google_calendar_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type AppSettings = typeof appSettings.$inferSelect;
```

- [ ] **Step 5: Register schema in db client**

Modify `db/index.ts`:

```ts
import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as tasksSchema from "./schema/tasks";
import * as physicalSchema from "./schema/physical";
import * as financeSchema from "./schema/finance";
import * as settingsSchema from "./schema/settings";

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, {
  schema: { ...tasksSchema, ...physicalSchema, ...financeSchema, ...settingsSchema },
});
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add db/migrations/0010_app_settings.sql db/schema/settings.ts db/index.ts
git commit -m "feat(db): add app_settings singleton for integration config"
```

---

## Task 2: Settings query helpers

**Files:**
- Create: `lib/queries/settings.ts`

- [ ] **Step 1: Write helpers**

`lib/queries/settings.ts`:

```ts
import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema/settings";

export async function getSelectedGoogleCalendars(): Promise<string[]> {
  const [row] = await db
    .select({ ids: appSettings.googleCalendarIds })
    .from(appSettings)
    .where(eq(appSettings.id, 1));
  return row?.ids ?? [];
}

export async function setSelectedGoogleCalendars(ids: string[]): Promise<void> {
  await db
    .update(appSettings)
    .set({ googleCalendarIds: ids, updatedAt: sql`now()` })
    .where(eq(appSettings.id, 1));
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/settings.ts
git commit -m "feat(settings): read/write selected google calendar ids"
```

---

## Task 3: Google client errors

**Files:**
- Create: `lib/google/errors.ts`

- [ ] **Step 1: Write error classes**

`lib/google/errors.ts`:

```ts
export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export class GoogleFetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GoogleFetchError";
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/google/errors.ts
git commit -m "feat(google): add typed error classes"
```

---

## Task 4: Google client — write failing tests

**Files:**
- Create: `lib/google/calendar.test.ts`

- [ ] **Step 1: Write tests against the not-yet-existing module**

`lib/google/calendar.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = { GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", GOOGLE_REFRESH_TOKEN: "rt" };

function mockFetchOnce(body: unknown, init: { status?: number } = {}) {
  return vi.spyOn(globalThis, "fetch" as never).mockImplementationOnce(
    async () =>
      new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("google calendar client", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ENV);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;
  });

  it("isConfigured true when all three env vars set", async () => {
    const mod = await import("./calendar");
    expect(mod.isConfigured()).toBe(true);
  });

  it("isConfigured false when refresh token missing", async () => {
    delete process.env.GOOGLE_REFRESH_TOKEN;
    const mod = await import("./calendar");
    expect(mod.isConfigured()).toBe(false);
  });

  it("getAccessToken posts refresh grant and returns access_token", async () => {
    const spy = mockFetchOnce({ access_token: "AT", expires_in: 3600 });
    const mod = await import("./calendar");
    const token = await mod.getAccessToken();
    expect(token).toBe("AT");
    expect(spy).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getAccessToken throws GoogleAuthError on 4xx", async () => {
    mockFetchOnce({ error: "invalid_grant" }, { status: 400 });
    const mod = await import("./calendar");
    await expect(mod.getAccessToken()).rejects.toMatchObject({ name: "GoogleAuthError" });
  });

  it("listCalendars maps response items", async () => {
    mockFetchOnce({ access_token: "AT", expires_in: 3600 });
    mockFetchOnce({
      items: [
        { id: "a@g.com", summary: "A", primary: true },
        { id: "b@g.com", summary: "B" },
      ],
    });
    const mod = await import("./calendar");
    const cals = await mod.listCalendars();
    expect(cals).toEqual([
      { id: "a@g.com", summary: "A", primary: true },
      { id: "b@g.com", summary: "B", primary: false },
    ]);
  });

  it("listEvents passes timeMin/timeMax/singleEvents", async () => {
    mockFetchOnce({ access_token: "AT", expires_in: 3600 });
    const eventsSpy = mockFetchOnce({ items: [] });
    const mod = await import("./calendar");
    await mod.listEvents("cal1", "2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z");
    const url = eventsSpy.mock.calls[0]![0] as string;
    expect(url).toContain("/calendars/cal1/events");
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("orderBy=startTime");
    expect(url).toContain(encodeURIComponent("2026-06-01T00:00:00.000Z"));
  });
});
```

- [ ] **Step 2: Run tests — confirm failing**

Run: `pnpm test lib/google/calendar.test.ts`
Expected: FAIL with "Cannot find module './calendar'" or similar.

---

## Task 5: Google client — implementation

**Files:**
- Create: `lib/google/calendar.ts`

- [ ] **Step 1: Write client**

`lib/google/calendar.ts`:

```ts
import "server-only";
import { GoogleAuthError, GoogleFetchError } from "./errors";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export type GoogleCalendarInfo = {
  id: string;
  summary: string;
  primary: boolean;
};

export type GoogleEvent = {
  id: string;
  calendarId: string;
  summary: string;
  startISO: string;
  endISO?: string;
  hasTime: boolean;
};

type TokenCache = { token: string; expiresAt: number };
let cached: TokenCache | null = null;

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(`token refresh failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    cached = null;
    throw new GoogleAuthError(`google api auth failed: ${res.status}`);
  }
  if (!res.ok) {
    throw new GoogleFetchError(`google api ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export async function listCalendars(): Promise<GoogleCalendarInfo[]> {
  type Resp = { items?: { id: string; summary?: string; primary?: boolean }[] };
  const json = await apiGet<Resp>("/users/me/calendarList");
  return (json.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary ?? c.id,
    primary: Boolean(c.primary),
  }));
}

export async function listEvents(
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<GoogleEvent[]> {
  type RawEvent = {
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  };
  type Resp = { items?: RawEvent[] };
  const qs = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
  });
  const json = await apiGet<Resp>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
  );
  return (json.items ?? []).map((e) => {
    const startDateTime = e.start?.dateTime;
    const startDate = e.start?.date;
    const endDateTime = e.end?.dateTime;
    const endDate = e.end?.date;
    const hasTime = Boolean(startDateTime);
    const startISO = startDateTime ?? (startDate ? `${startDate}T00:00:00.000Z` : "");
    const endISO = endDateTime ?? (endDate ? `${endDate}T00:00:00.000Z` : undefined);
    return {
      id: `${calendarId}:${e.id}`,
      calendarId,
      summary: e.summary ?? "(no title)",
      startISO,
      endISO,
      hasTime,
    };
  });
}
```

- [ ] **Step 2: Run tests — confirm passing**

Run: `pnpm test lib/google/calendar.test.ts`
Expected: 5 passed.

- [ ] **Step 3: Commit**

```bash
git add lib/google/calendar.ts lib/google/calendar.test.ts
git commit -m "feat(google): add calendar client with token refresh + list APIs"
```

---

## Task 6: OAuth bootstrap script

**Files:**
- Create: `scripts/google-oauth.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write script**

`scripts/google-oauth.mjs`:

```js
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
```

- [ ] **Step 2: Add npm script**

Modify `package.json` scripts block — add line after `"db:studio"`:

```json
    "db:studio": "drizzle-kit studio",
    "google:oauth": "node scripts/google-oauth.mjs"
```

- [ ] **Step 3: Smoke-test script wiring**

Run: `pnpm google:oauth` then immediately Ctrl-C.
Expected: prints "Missing GOOGLE_CLIENT_ID..." (or if env present, prints consent URL). Either confirms script runs.

- [ ] **Step 4: Commit**

```bash
git add scripts/google-oauth.mjs package.json
git commit -m "feat(google): add one-time oauth bootstrap script"
```

---

## Task 7: .env.local.example

**Files:**
- Create (or modify if exists): `.env.local.example`

- [ ] **Step 1: Document env vars**

Append to `.env.local.example` (create if missing):

```
# Google Calendar integration (read-only)
# Create OAuth client in Google Cloud Console (type: Web application,
# redirect URI: http://localhost:3000/oauth2callback). Then run:
#   pnpm google:oauth
# and paste the printed GOOGLE_REFRESH_TOKEN below.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs(env): document google calendar env vars"
```

---

## Task 8: Server actions — write failing tests

**Files:**
- Create: `app/(tasks)/_actions/google.test.ts`

- [ ] **Step 1: Write tests**

`app/(tasks)/_actions/google.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/queries/settings", () => ({
  getSelectedGoogleCalendars: vi.fn(),
  setSelectedGoogleCalendars: vi.fn(),
}));
vi.mock("@/lib/google/calendar", () => ({
  isConfigured: vi.fn(),
  listCalendars: vi.fn(),
  listEvents: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import * as settings from "@/lib/queries/settings";
import * as gcal from "@/lib/google/calendar";

describe("google server actions", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("listGoogleCalendarsAction returns connected:false when not configured", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const mod = await import("./google");
    const res = await mod.listGoogleCalendarsAction();
    expect(res).toEqual({ connected: false, calendars: [], selected: [] });
  });

  it("listGoogleCalendarsAction merges calendars + selection when connected", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (gcal.listCalendars as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "a", summary: "A", primary: true },
    ]);
    (settings.getSelectedGoogleCalendars as ReturnType<typeof vi.fn>).mockResolvedValue(["a"]);
    const mod = await import("./google");
    const res = await mod.listGoogleCalendarsAction();
    expect(res).toEqual({
      connected: true,
      calendars: [{ id: "a", summary: "A", primary: true }],
      selected: ["a"],
    });
  });

  it("saveSelectedGoogleCalendarsAction validates and persists", async () => {
    const mod = await import("./google");
    await mod.saveSelectedGoogleCalendarsAction(["a", "b"]);
    expect(settings.setSelectedGoogleCalendars).toHaveBeenCalledWith(["a", "b"]);
  });

  it("saveSelectedGoogleCalendarsAction rejects non-string array", async () => {
    const mod = await import("./google");
    await expect(
      // @ts-expect-error invalid input
      mod.saveSelectedGoogleCalendarsAction([1, 2]),
    ).rejects.toThrow();
  });

  it("fetchGoogleEventsAction returns empty when not configured", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const mod = await import("./google");
    const res = await mod.fetchGoogleEventsAction("2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z");
    expect(res).toEqual({ items: [], error: null });
  });

  it("fetchGoogleEventsAction fans out across selected calendars", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (settings.getSelectedGoogleCalendars as ReturnType<typeof vi.fn>).mockResolvedValue(["a", "b"]);
    (gcal.listEvents as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => [
      {
        id: `${id}:e1`,
        calendarId: id,
        summary: `evt-${id}`,
        startISO: "2026-06-02T10:00:00.000Z",
        endISO: "2026-06-02T11:00:00.000Z",
        hasTime: true,
      },
    ]);
    const mod = await import("./google");
    const res = await mod.fetchGoogleEventsAction(
      "2026-06-01T00:00:00.000Z",
      "2026-06-08T00:00:00.000Z",
    );
    expect(res.error).toBeNull();
    expect(res.items).toHaveLength(2);
    expect(res.items[0].source).toBe("google");
    expect(res.items[0].kind).toBe("gcal");
  });

  it("fetchGoogleEventsAction tolerates partial calendar failure", async () => {
    (gcal.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (settings.getSelectedGoogleCalendars as ReturnType<typeof vi.fn>).mockResolvedValue(["ok", "bad"]);
    (gcal.listEvents as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => {
      if (id === "bad") throw new Error("boom");
      return [
        {
          id: `${id}:e1`,
          calendarId: id,
          summary: "ok",
          startISO: "2026-06-02T10:00:00.000Z",
          hasTime: true,
        },
      ];
    });
    const mod = await import("./google");
    const res = await mod.fetchGoogleEventsAction(
      "2026-06-01T00:00:00.000Z",
      "2026-06-08T00:00:00.000Z",
    );
    expect(res.items).toHaveLength(1);
    expect(res.error).toBe("partial");
  });
});
```

- [ ] **Step 2: Run tests — confirm failing**

Run: `pnpm test app/\(tasks\)/_actions/google.test.ts`
Expected: FAIL — module not found.

---

## Task 9: Server actions — implementation

**Files:**
- Create: `app/(tasks)/_actions/google.ts`

- [ ] **Step 1: Write actions**

`app/(tasks)/_actions/google.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isConfigured,
  listCalendars,
  listEvents,
  type GoogleCalendarInfo,
} from "@/lib/google/calendar";
import { GoogleAuthError } from "@/lib/google/errors";
import {
  getSelectedGoogleCalendars,
  setSelectedGoogleCalendars,
} from "@/lib/queries/settings";

export type GoogleCalendarItem = {
  id: string;
  taskId: null;
  title: string;
  status: null;
  kind: "gcal";
  source: "google";
  dateISO: string;
  endISO?: string;
  hasTime: boolean;
};

export type ListCalendarsResult = {
  connected: boolean;
  calendars: GoogleCalendarInfo[];
  selected: string[];
};

export async function listGoogleCalendarsAction(): Promise<ListCalendarsResult> {
  if (!isConfigured()) return { connected: false, calendars: [], selected: [] };
  try {
    const [calendars, selected] = await Promise.all([
      listCalendars(),
      getSelectedGoogleCalendars(),
    ]);
    return { connected: true, calendars, selected };
  } catch {
    return { connected: true, calendars: [], selected: [] };
  }
}

const idsSchema = z.array(z.string().min(1)).max(50);

export async function saveSelectedGoogleCalendarsAction(ids: string[]): Promise<void> {
  const parsed = idsSchema.parse(ids);
  await setSelectedGoogleCalendars(parsed);
  revalidatePath("/calendar");
}

export type FetchEventsResult = {
  items: GoogleCalendarItem[];
  error: null | "auth" | "fetch" | "partial";
};

export async function fetchGoogleEventsAction(
  startISO: string,
  endISO: string,
): Promise<FetchEventsResult> {
  if (!isConfigured()) return { items: [], error: null };
  let selected: string[];
  try {
    selected = await getSelectedGoogleCalendars();
  } catch {
    return { items: [], error: "fetch" };
  }
  if (selected.length === 0) return { items: [], error: null };

  const results = await Promise.allSettled(
    selected.map((id) => listEvents(id, startISO, endISO)),
  );

  let anyAuth = false;
  let anyFail = false;
  const items: GoogleCalendarItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const e of r.value) {
        items.push({
          id: e.id,
          taskId: null,
          title: e.summary,
          status: null,
          kind: "gcal",
          source: "google",
          dateISO: e.startISO,
          endISO: e.endISO,
          hasTime: e.hasTime,
        });
      }
    } else {
      anyFail = true;
      if (r.reason instanceof GoogleAuthError) anyAuth = true;
    }
  }

  if (anyAuth && items.length === 0) return { items: [], error: "auth" };
  if (anyFail && items.length === 0) return { items: [], error: "fetch" };
  if (anyFail) return { items, error: "partial" };
  return { items, error: null };
}
```

- [ ] **Step 2: Run tests — confirm passing**

Run: `pnpm test app/\(tasks\)/_actions/google.test.ts`
Expected: 7 passed.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add 'app/(tasks)/_actions/google.ts' 'app/(tasks)/_actions/google.test.ts'
git commit -m "feat(google): server actions for calendars + events fetch"
```

---

## Task 10: Extend `CalendarItem` and render gcal chips

**Files:**
- Modify: `app/(tasks)/_components/CalendarView.tsx`

- [ ] **Step 1: Extend `CalendarItem` type**

Replace the existing `export type CalendarItem` block (top of file) with:

```ts
export type CalendarItem = {
  id: string;
  taskId: string | null;
  title: string;
  status: TaskStatus | null;
  kind: "due" | "action" | "gcal";
  source?: "task" | "google";
  dateISO: string;
  endISO?: string;
  hasTime: boolean;
};
```

- [ ] **Step 2: Add a toolbar slot prop**

Update the component signature and place the slot next to the existing view-mode toggle. Find:

```tsx
export function CalendarView({ items }: { items: CalendarItem[] }) {
```

Replace with:

```tsx
export function CalendarView({
  items,
  toolbarExtras,
}: {
  items: CalendarItem[];
  toolbarExtras?: React.ReactNode;
}) {
```

Then add `{toolbarExtras}` inside the existing toolbar `<div className="flex items-center gap-2">` block that contains the prev/next buttons (the leftmost flex row in the header).

- [ ] **Step 3: Render gcal chips distinctly**

Locate every render site that draws a chip for a `CalendarItem` (search the file for the existing `statusDot[item.status]` / `Link` usage). For each, wrap the chip in a branch:

```tsx
{item.source === "google" || item.kind === "gcal" ? (
  <div
    key={item.id}
    className="truncate rounded px-1.5 py-0.5 text-xs bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
    title={item.title}
  >
    {item.hasTime ? `${format(new Date(item.dateISO), "HH:mm")} ` : ""}
    {item.title}
  </div>
) : (
  // existing Link/chip JSX unchanged
)}
```

If there are two render sites (week vs month), apply the same branch to both.

- [ ] **Step 4: Guard nullable `status`/`taskId` in existing chip JSX**

In the existing (non-gcal) branch, the previous code accessed `item.status` and `item.taskId` directly. Both are now nullable in the type. Add a non-null assertion only where the branch already guarantees they are present: since the branch is taken only when `source !== "google"` and `kind !== "gcal"`, both are guaranteed populated by callers. Use `item.status!` and `item.taskId!` inline at those call sites.

- [ ] **Step 5: Typecheck + tests**

Run: `pnpm typecheck && pnpm test`
Expected: no errors; all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add 'app/(tasks)/_components/CalendarView.tsx'
git commit -m "feat(calendar): render google events as distinct chips"
```

---

## Task 11: `GoogleCalendarButton` client component

**Files:**
- Create: `app/(tasks)/_components/GoogleCalendarButton.tsx`

- [ ] **Step 1: Inspect available shadcn primitives**

Run: `ls components/ui`
Expected: includes `button.tsx`. Note whether `popover.tsx`, `dialog.tsx`, `checkbox.tsx` exist; the snippet below uses `<details>` + `<input type="checkbox">` to avoid assuming primitives are installed.

- [ ] **Step 2: Write component**

`app/(tasks)/_components/GoogleCalendarButton.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listGoogleCalendarsAction,
  saveSelectedGoogleCalendarsAction,
} from "../_actions/google";

type CalInfo = { id: string; summary: string; primary: boolean };

type LoadedState = {
  status: "idle" | "loading" | "ready" | "disconnected";
  calendars: CalInfo[];
  selected: Set<string>;
};

export function GoogleCalendarButton({ initialConnected }: { initialConnected: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<LoadedState>({
    status: initialConnected ? "idle" : "disconnected",
    calendars: [],
    selected: new Set(),
  });

  async function onToggle() {
    const next = !open;
    setOpen(next);
    if (next && state.status === "idle") {
      setState((s) => ({ ...s, status: "loading" }));
      const res = await listGoogleCalendarsAction();
      if (!res.connected) {
        setState({ status: "disconnected", calendars: [], selected: new Set() });
        return;
      }
      setState({
        status: "ready",
        calendars: res.calendars,
        selected: new Set(res.selected),
      });
    }
  }

  function toggleId(id: string) {
    setState((s) => {
      const next = new Set(s.selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, selected: next };
    });
  }

  function save() {
    const ids = Array.from(state.selected);
    startTransition(async () => {
      try {
        await saveSelectedGoogleCalendarsAction(ids);
        toast.success("Calendar selection saved");
        setOpen(false);
      } catch {
        toast.error("Could not save selection");
      }
    });
  }

  if (state.status === "disconnected") {
    return (
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          Connect Google Calendar
        </Button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-popover p-3 text-sm shadow">
            <p className="font-medium">Connect Google Calendar</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                Create an OAuth Client (Web app) in Google Cloud Console with redirect URI
                <code className="ml-1">http://localhost:3000/oauth2callback</code>.
              </li>
              <li>
                Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to{" "}
                <code>.env.local</code>.
              </li>
              <li>
                Run <code>pnpm google:oauth</code> and paste the printed{" "}
                <code>GOOGLE_REFRESH_TOKEN</code> into <code>.env.local</code>.
              </li>
              <li>Restart the dev server and refresh this page.</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  const label =
    state.status === "ready"
      ? `Google Calendar (${state.selected.size})`
      : "Google Calendar";

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={onToggle} disabled={pending}>
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-popover p-3 text-sm shadow">
          {state.status === "loading" && <p>Loading calendars…</p>}
          {state.status === "ready" && (
            <>
              <p className="mb-2 font-medium">Show events from</p>
              <ul className="max-h-64 space-y-1 overflow-auto">
                {state.calendars.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <input
                      id={`gcal-${c.id}`}
                      type="checkbox"
                      checked={state.selected.has(c.id)}
                      onChange={() => toggleId(c.id)}
                    />
                    <label htmlFor={`gcal-${c.id}`} className="truncate">
                      {c.summary} {c.primary ? "(primary)" : ""}
                    </label>
                  </li>
                ))}
                {state.calendars.length === 0 && (
                  <li className="text-muted-foreground">No calendars returned.</li>
                )}
              </ul>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={pending}>
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add 'app/(tasks)/_components/GoogleCalendarButton.tsx'
git commit -m "feat(calendar): add google calendar connect/select button"
```

---

## Task 12: Wire calendar page to fetch + merge events

**Files:**
- Modify: `app/(tasks)/calendar/page.tsx`

- [ ] **Step 1: Replace page with merging version**

`app/(tasks)/calendar/page.tsx`:

```tsx
import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fetchTasks } from "@/lib/tasks-query";
import { CalendarView, type CalendarItem } from "../_components/CalendarView";
import { GoogleCalendarButton } from "../_components/GoogleCalendarButton";
import {
  fetchGoogleEventsAction,
  listGoogleCalendarsAction,
} from "../_actions/google";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // Conservative range covering both week and month views from today's cursor.
  const now = new Date();
  const monthStart = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(now), { weekStartsOn: 1 });
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(addWeeks(weekStart, 1), -1);
  const rangeStart = monthStart < weekStart ? monthStart : weekStart;
  const rangeEnd = monthEnd > weekEnd ? monthEnd : weekEnd;

  const [tasks, gcal, gcalMeta] = await Promise.all([
    fetchTasks({ status: "all" }),
    fetchGoogleEventsAction(rangeStart.toISOString(), rangeEnd.toISOString()),
    listGoogleCalendarsAction(),
  ]);

  const items: CalendarItem[] = [];
  for (const t of tasks) {
    const due = t.dueAt ? new Date(t.dueAt) : null;
    const action = t.actionAt ? new Date(t.actionAt) : null;
    if (due) {
      items.push({
        id: `${t.id}:due`,
        taskId: t.id,
        title: t.title,
        status: t.status,
        kind: "due",
        source: "task",
        dateISO: due.toISOString(),
        hasTime: due.getHours() !== 0 || due.getMinutes() !== 0,
      });
    }
    if (action) {
      const actionEnd = t.actionEndAt ? new Date(t.actionEndAt) : null;
      items.push({
        id: `${t.id}:action`,
        taskId: t.id,
        title: t.title,
        status: t.status,
        kind: "action",
        source: "task",
        dateISO: action.toISOString(),
        endISO: actionEnd ? actionEnd.toISOString() : undefined,
        hasTime: action.getHours() !== 0 || action.getMinutes() !== 0,
      });
    }
  }
  for (const e of gcal.items) items.push(e);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      </header>
      <CalendarView
        items={items}
        toolbarExtras={<GoogleCalendarButton initialConnected={gcalMeta.connected} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(tasks)/calendar/page.tsx'
git commit -m "feat(calendar): merge google events into calendar page"
```

---

## Task 13: Manual verification

**Files:** none

- [ ] **Step 1: Boot dev server**

Run: `pnpm dev`
Open `http://localhost:3000/calendar`.

- [ ] **Step 2: Confirm disconnected state**

Without env vars, button label = "Connect Google Calendar". Popover shows 4-step instructions. No gcal chips render.

- [ ] **Step 3: Run OAuth bootstrap**

In separate shell: `pnpm google:oauth`. Follow prompt. Paste returned `GOOGLE_REFRESH_TOKEN` into `.env.local`. Restart `pnpm dev`.

- [ ] **Step 4: Connected state**

Button now reads "Google Calendar (0)". Click → list of user's calendars. Tick primary → Save. Toast "Calendar selection saved".

- [ ] **Step 5: Events appear**

Refresh `/calendar`. Events in current week/month render as muted slate chips, no link. Task chips unchanged.

- [ ] **Step 6: Simulate auth failure**

Edit `.env.local` to corrupt `GOOGLE_REFRESH_TOKEN`. Reload page. Calendar still renders task chips; no Google chips; no crash.

- [ ] **Step 7: Restore + commit nothing**

Restore env. No code commit for this task.

---

## Task 14: Final checks + push

- [ ] **Step 1: Lint + typecheck + tests**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 2: Review diff vs main**

Run: `git log --oneline main..HEAD`
Expected: ~10 commits in the order above.

- [ ] **Step 3: Stop here**

Do not push or open a PR unless the user asks.

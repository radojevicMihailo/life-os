# Google Calendar Integration — Design

Date: 2026-06-03
Scope: Read-only Google Calendar events surfaced inside the existing tasks `CalendarView`.

## Goal

Show Google Calendar events alongside tasks in the calendar view so the user has a single timeline of their schedule. No writes to Google.

## Non-goals

- Two-way sync (no creating/updating events from life-os).
- Multi-user / per-user OAuth. App is single-user.
- Webhook/push notifications. Pull on view.
- Cached event storage in Postgres.
- Reminders, attendees, conferencing data.
- Calendar import as tasks.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Sync direction | Read-only (Google → life-os) |
| Fetch model | On-demand per view render |
| Auth | Single-user OAuth, refresh token in `.env.local` |
| Calendar scope | User-selected subset from their `calendarList` |
| Connect UI | Inline button + popover on calendar page |
| Visual treatment | Single muted "gcal" color across all Google events |

## Architecture

### 1. OAuth bootstrap (one-time)

Script `scripts/google-oauth.mjs`:

1. Reads `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` from `.env.local`.
2. Prints consent URL with scope `https://www.googleapis.com/auth/calendar.readonly` and `access_type=offline&prompt=consent`.
3. User pastes back the redirect URL or auth code.
4. Script exchanges code → refresh token, prints `GOOGLE_REFRESH_TOKEN=...` line to paste into `.env.local`.

Redirect URI: `http://localhost:3000/oauth2callback` (no route handler needed — script just parses the code from the URL the user pastes back).

`package.json` script: `"google:oauth": "node scripts/google-oauth.mjs"`.

### 2. Google client module

`lib/google/calendar.ts` (server-only via `import "server-only"`):

- `getAccessToken(): Promise<string>` — refreshes via `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`. In-memory cache keyed on process; expires 60s before Google's expiry.
- `listCalendars(): Promise<{ id: string; summary: string; primary?: boolean }[]>` — `GET /calendar/v3/users/me/calendarList`.
- `listEvents(calendarId, timeMinISO, timeMaxISO): Promise<RawEvent[]>` — `GET /calendar/v3/calendars/{calendarId}/events?singleEvents=true&orderBy=startTime&timeMin&timeMax&maxResults=2500`.
- `isConfigured(): boolean` — checks env presence; used by UI.

No SDK dependency. Plain `fetch`. Module throws `GoogleAuthError` on 401, `GoogleFetchError` on other failures.

### 3. Settings table

Migration `db/migrations/0010_app_settings.sql`:

```sql
create table if not exists app_settings (
  id smallint primary key default 1 check (id = 1),
  google_calendar_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (1) on conflict do nothing;
```

Drizzle schema: `db/schema/settings.ts` exporting `appSettings`.

Queries `lib/queries/settings.ts`:
- `getSelectedGoogleCalendars(): Promise<string[]>`
- `setSelectedGoogleCalendars(ids: string[]): Promise<void>`

### 4. Server actions

`app/(tasks)/_actions/google.ts`:

- `listGoogleCalendarsAction()` — returns `{ connected: boolean, calendars: {id, summary, primary}[], selected: string[] }`. If not configured, returns `connected:false, calendars: [], selected: []`.
- `saveSelectedGoogleCalendarsAction(ids: string[])` — validates with zod (`z.array(z.string()).max(50)`), persists, `revalidatePath` on tasks calendar route.
- `fetchGoogleEventsAction(startISO, endISO)` — reads selected ids, fans out `listEvents` in parallel, flattens, maps to `CalendarItem`. On error returns `{ items: [], error: "..." }` instead of throwing so the page still renders tasks.

### 5. CalendarItem extension

`CalendarItem` type in `CalendarView.tsx`:

```ts
export type CalendarItem = {
  id: string;
  taskId: string | null;     // null for gcal
  title: string;
  status: TaskStatus | null; // null for gcal
  kind: "due" | "action" | "gcal";
  source: "task" | "google";
  dateISO: string;
  endISO?: string;
  hasTime: boolean;
};
```

Rendering rule: `source === "google"` → muted slate chip (`bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300`), no link wrapper, italic title prefix-free. Task chips unchanged.

### 6. Toolbar UI

In `app/(tasks)/calendar/page.tsx` (server component) compute visible week/month range, call `fetchGoogleEventsAction(start, end)` in parallel with existing task fetch, merge into `items`, pass to `CalendarView`.

New client component `GoogleCalendarButton.tsx`, rendered next to view-mode toggle:

- Not configured: button label "Connect Google Calendar", opens dialog with step-by-step instructions (set env vars, run `pnpm google:oauth`, paste refresh token, restart dev server).
- Configured: button label "Google Calendar (N)" where N = selected count. Opens popover with checkbox list from `listGoogleCalendarsAction`. Save triggers `saveSelectedGoogleCalendarsAction` and refresh.

## Data flow (read path)

```
calendar page (server)
  ├─ getTasksForRange(start,end)            ─┐
  └─ fetchGoogleEventsAction(start,end)     ─┤── merge → CalendarItem[] → <CalendarView />
                                              ┘
```

Range = current week or month, computed identically to `CalendarView`'s `days[]` boundaries (first/last day inclusive).

## Error handling

| Failure | Behavior |
|---|---|
| Env vars missing | `isConfigured()` false; action returns empty; button shows "Connect…" |
| Token refresh 4xx | Action returns `{ items: [], error: "auth" }`; toast on client: "Google Calendar auth expired — re-run `pnpm google:oauth`" |
| `events.list` 5xx / network | Action returns `{ items: [], error: "fetch" }`; toast "Couldn't load Google events"; tasks still render |
| Partial calendar failure | Successful calendars' events returned; failing ones logged server-side, omitted silently |

## Security

- `.env.local` already gitignored.
- `lib/google/calendar.ts` and queries marked `server-only`.
- Server actions don't accept tokens from client; client only sends calendar id strings (validated).
- No PII logging beyond calendar summaries on error paths.

## Testing

- `lib/google/calendar.test.ts` — vitest, mocks `fetch`: token refresh, 401 mapping, events parse.
- `app/(tasks)/_actions/google.test.ts` — selection persistence, fan-out, partial-failure aggregation.
- Manual: connect, toggle calendars, switch week/month, force a token error (corrupt env), confirm graceful degradation.

## File / module touch list

New:
- `scripts/google-oauth.mjs`
- `lib/google/calendar.ts`
- `lib/queries/settings.ts`
- `db/schema/settings.ts`
- `db/migrations/0010_app_settings.sql`
- `app/(tasks)/_actions/google.ts`
- `app/(tasks)/_components/GoogleCalendarButton.tsx`

Modified:
- `app/(tasks)/_components/CalendarView.tsx` — extended `CalendarItem`, gcal rendering branch, slot for button in toolbar.
- `app/(tasks)/calendar/page.tsx` — parallel fetch + merge.
- `package.json` — `google:oauth` script.
- `.env.local.example` (create if absent) — document the three env vars.

## Open implementation notes

- All-day events from Google use `date` (no `time`); map to `hasTime:false, dateISO: <date>T00:00:00`.
- Timed events use `dateTime` with offset; preserve as ISO. `endISO` carried for future use; current `CalendarView` mostly renders by `dateISO` day bucket.
- `maxResults=2500` covers monthly view comfortably; no pagination needed for v1.

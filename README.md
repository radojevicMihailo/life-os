# Life-OS

Personal life tracker. First module: task manager.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL 16 (local via Docker)
- Drizzle ORM
- Zod, date-fns
- Vitest

## Local dev

```bash
pnpm install
pnpm db:up         # starts Postgres in Docker on port 5433
pnpm db:migrate    # applies migrations
pnpm dev           # http://localhost:3000
```

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm build` / `pnpm start` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint
- `pnpm test` — Vitest
- `pnpm db:up` / `pnpm db:down` — start/stop Postgres
- `pnpm db:generate` — generate Drizzle migration from schema
- `pnpm db:migrate` — apply pending migrations
- `pnpm db:push` — sync schema without a migration file (dev only)
- `pnpm db:studio` — Drizzle Studio

## Modules

- **Tasks** (`app/(tasks)/...`) — tasks, projects, tags, recurring tasks. v1.

Future modules will live under their own route groups.

## Layout

```
app/(tasks)/        # task manager module
  tasks/            # task list + detail
  projects/         # projects + detail
  tags/             # tag management
  _actions/         # server actions per module
  _components/      # module-local components
components/ui/      # shadcn primitives
db/
  schema/tasks.ts   # Drizzle schema
  migrations/       # generated SQL migrations
lib/
  validation/       # Zod schemas (shared client + server)
  recurrence.ts     # pure nextOccurrence() — unit tested
  tasks-query.ts    # task list query helper
  task-sections.ts  # grouping helpers (Overdue / Today / Upcoming / No date)
  format.ts         # date + priority formatters
docs/superpowers/specs/  # design specs
```

## Notes

- Single user, no auth. Local only — do not expose without adding auth.
- Postgres bound to `localhost:5433` to avoid clashing with other local Postgres instances.

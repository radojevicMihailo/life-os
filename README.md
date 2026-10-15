# Life OS

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
cp .env.example .env.local
# Set LIFE_OS_ACCESS_PASSWORD in .env.local to a unique value of at least 24 characters.
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

## Finansije

- `/finance/planning` — jednokratni i ponavljajući prihodi/obaveze. Potvrda
  knjiži stvarni promet; povezivanje postojeće transakcije ne pravi novi promet.
  Preskakanje menja plan, a korekcija/brisanje povezanog knjiženja ažurira potvrdu.
- `/finance` — raspoloživ novac do sledećeg planiranog prihoda, uz odbitak
  rezervacija i obaveza bez duplog oduzimanja iste budžetske namene. Izbor
  uključenih računa je u finansijskim podešavanjima; potraživanja i investiciona
  gotovina podrazumevano nisu novac za svakodnevnu potrošnju.
- `/finance/budgets` — tempo, upozorenja, projekcija i prethodna tri meseca.
- `/finance/goals` — opcioni rok i potreban mesečni iznos štednje. Potraživanja
  su prikazana odvojeno; nepokrivene rezervacije ne daju obećanje finansiranja.
- `/finance/reports` — mesečni tokovi, stopa štednje i istorija neto imovine.
  Kupovine/prodaje investicija odvojene su od tržišnog i valutnog efekta.
  Nedostajući istorijski izvori daju prazninu, bez korišćenja budućih cena.
- Transakcije podržavaju pretragu opisa, filtere po nazivima i stabilnu paginaciju.

Za ove funkcije potrebne su dodatne migracije `0017` i `0018`, koje se primenjuju
postojećom komandom `pnpm db:migrate`. Planirane stavke se ne knjiže automatski;
nema novih servisa, dodatnih poziva provajderima ili bankarskog uvoza.

Finansijski integracioni testovi podrazumevano koriste Docker. Ako je dostupan
zaseban lokalni PostgreSQL server, može se zadati `FINANCE_TEST_POSTGRES_URL`
(npr. `postgresql://postgres@127.0.0.1:55439/postgres`). Svaki test paket tada
kreira i po završetku briše sopstvenu nasumično imenovanu `finance_test_*` bazu.
Ovu promenljivu ne usmeravati na aplikacionu bazu.

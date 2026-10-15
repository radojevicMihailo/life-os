# Application improvements implementation plan

**Goal:** Implement the application-wide performance, reliability and usability improvements approved in conversation.

**Architecture:** Keep Next.js Server Components, PostgreSQL and existing module actions. Split independent dashboard panels, bound large lists, reuse existing forms and keep all writes behind existing authorization. No new services or dependencies.

**Constraints:** Preserve existing user changes in AGENTS.md. No commits, deployment, infrastructure changes or increased service costs. Keep the existing 512 MB machine. Work in the current user-provided workspace; user explicitly requested implementation of the whole reviewed plan. Existing tests that assert changed UI copy must be updated to the approved Serbian UI.

## Tasks

- [x] 1. Notes: autosave all note types with retry and navigation protection; server-side search/category filters and bounded previews with load-more links. Preserve full-content search.
- [x] 2. Dashboard and habits: independent streamed panels with useful errors, next event, three priority tasks with completion/reschedule actions, directly editable habits, compact hero and quick action destinations. Reuse statistics per habit; use Belgrade day boundaries consistently for current dates.
- [x] 3. Tasks: server-side query across title/notes with stable ordering and bounded load-more pagination preserving filters. Avoid changing project callers that need complete datasets.
- [x] 4. Global navigation: authenticated bounded search over tasks/projects/notes and screens, Cmd/Ctrl+K dialog, keyboard help, quick creation using existing forms/routes, mobile bottom navigation and local favorite destinations.
- [x] 5. Visual consistency: move investment setup and entry into expandable dialogs below overview, semantic theme colors for finance, shared page/form spacing, compact/comfortable preference, Serbian user-facing statuses and confirmations.
- [x] 6. Performance and delivery: safe targeted request memoization/catalog caching with invalidation, parallel independent queries, local performance measurements, CI lint/typecheck/unit checks before deploy.
- [x] 7. Verification: unit suite, lint, typecheck, production build and disposable-database browser checks where available; independent final code review and repairs.

## Review focus

- Failed saves must never look saved; edits during an in-flight save must survive.
- Search must query the whole dataset, escape literal SQL wildcards and preserve pagination filters.
- Calendar failure must not prevent tasks or habits from rendering; completed events must not become the next event.
- Search endpoints must authorize every request and return only small bounded result sets.
- Mobile navigation must not cover form actions; dialogs must retain keyboard focus and support Escape.

## Progress and decisions

- Initial state: only AGENTS.md has user changes. No product code changed before this plan.
- Implementation approval: user's “slazem se. realizuj citav plan” authorizes all reviewed reversible changes; no additional approval gates for those changes.
- Tests: behavior changes get focused regression tests before implementation; visual styling is checked by build and browser inspection.

- Complete: notes and product text autosave, durable draft recovery, uncertain product additions retained for manual retry; late acknowledgments preserve newer drafts across editor instances.
- Complete: independent Suspense panels, next ongoing/upcoming event, priority-task actions, editable habits, one statistics pass per habit, Belgrade date helpers.
- Complete: tasks bounded to 50 by default (up to 500 per page), notes bounded to 30, stable ordering, full-content literal search and preserved URL filters.
- Complete: authenticated command search, keyboard help, quick-create entrypoints, mobile bottom navigation/favorites, density preference, mobile sticky actions above navigation.
- Complete: finance overview before entry, mounted expandable forms, semantic light/dark colors, Serbian labels and shared page spacing.
- Performance ruling: use React request memoization for configuration/catalog reads instead of introducing persistent cross-request caches. No stale-data window or extra invalidation mechanism; keep authenticated dynamic rendering. Meal targets start alongside independent reads.
- Delivery: source CI checks gate future deployment; no workflow was triggered and no deployment performed. No infrastructure configuration or dependencies changed.
- Independent review: repaired dirty-note navigation, failed-add recovery, stale draft-store acknowledgments, repeat quick-create opening, hidden command dialogs and controlled product text after purchased toggles.
- Final validation: pnpm test → 119 files / 568 tests; pnpm lint → pass; pnpm typecheck → pass; pnpm build → pass; browser suite → 16/16 plus 5/5 existing task/calendar regressions.
- Visual validation: native Chrome inspection of home dark theme and finance light theme; browser regression checks narrow viewport, mobile actions above bottom nav and expandable form input preservation.
- Local measurements: warm response headers 5–17 ms and full HTML 6–30 ms for six routes on the disposable local database. These are local smoke measurements, not production performance or a before/after claim; repeat with scripts/measure-pages.mjs.
- No commits created. Existing AGENTS.md user change preserved. Temporary test server/database stopped after verification.

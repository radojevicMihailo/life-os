# App Redesign — Modern Dashboard (Theme + Shell)

**Date:** 2026-06-23
**Status:** Approved design, pending spec review

## Goal

Restyle the entire Life OS app to a "modern dashboard" aesthetic (sharp,
productive, techy — Linear/Vercel-adjacent) by changing global theme tokens and
reworking the app shell. No per-page layout rework: every page inherits the new
look through design tokens and shared UI components.

## Decisions

- **Aesthetic:** modern dashboard.
- **Accent color:** indigo.
- **Neutrals:** slate-tinted (small blue chroma), not pure gray.
- **Default theme:** light on first load; sun/moon toggle switches to dark; the
  choice is persisted (next-themes default `localStorage`).
- **Base font size:** keep `20px` (airy). NOT reduced.
- **Headings:** drop the Marcellus serif; use the existing Geist sans, bold.
- **Radius:** `0.625rem → 0.5rem` (slightly crisper).

## Scope

In scope:

- `app/globals.css` — color tokens (light + dark), radius.
- `app/layout.tsx` — mount theme provider, font wiring, shell composition.
- Shell components — `components/sidebar.tsx`, `components/nav-tree.tsx`, a new
  `PageHeader`, a new theme toggle, a theme provider wrapper.
- Shared UI primitives in `components/ui/*` where a global polish is needed
  (card, button focus rings). Only token/utility-level edits, no API changes.

Out of scope:

- Redesigning individual page layouts (tasks, finance, meals, etc.). They get
  the new look for free via tokens + components. Page-level redesigns are a
  separate future effort.
- Any data, schema, or behavior changes.

## Design detail

### 1. Color tokens (`app/globals.css`)

Replace the current all-neutral palette. Keep the existing CSS-variable
structure (the `@theme inline` mapping and `:root` / `.dark` blocks stay); only
the values change.

- `--primary` (light): indigo, approx `oklch(0.51 0.20 269)`;
  `--primary-foreground`: near-white.
- `--primary` (dark): brighter indigo, approx `oklch(0.62 0.19 269)`.
- `--ring`: indigo-derived in both modes (focus rings become indigo).
- Neutrals (`--background`, `--card`, `--muted`, `--secondary`, `--accent`,
  `--border`, `--input`, sidebar tokens): shift from `hue 0 / chroma 0` to a
  slate tint (hue ~265, chroma ~0.005–0.02). Light backgrounds stay near-white;
  dark background goes near-black slate, approx `oklch(0.16 0.01 265)`.
- `--accent` / `--accent-foreground` (used by nav hover/active): a faint indigo
  tint so active/hover states read as indigo rather than gray.
- Charts `--chart-1..5`: replace grays with an indigo/violet/sky/cyan/teal
  sequence so recharts visuals have color.
- `--radius`: `0.625rem → 0.5rem`.
- `--destructive`: keep current red (already fine).

Exact oklch values are tuned during implementation against both modes; the
values above are the target direction, not literal final constants.

### 2. Typography

- `app/globals.css`: `--font-sans` and `--font-heading` both resolve to Geist
  sans (drop `var(--font-marcellus)` from the chain).
- `app/layout.tsx`: remove the `Marcellus` font import/loader and its `variable`
  on `<html>`. Headings use Geist bold via existing `font-heading` usage.
- Base `font-size: 20px` on `html` stays unchanged.

### 3. Shell

- **Theme provider:** add `components/theme-provider.tsx` (client wrapper around
  `next-themes` `ThemeProvider`, `attribute="class"`, `defaultTheme="light"`,
  `enableSystem={false}`). Mount it in `app/layout.tsx` wrapping the app (inside
  or around `PomodoroProvider`). `<html>` needs `suppressHydrationWarning`.
- **Theme toggle:** add `components/theme-toggle.tsx` (client). Sun/moon icon
  button (lucide `Sun`/`Moon`), `useTheme()` to switch. Placed in the sidebar
  footer next to / above `PomodoroBadge`.
- **Sidebar (`components/sidebar.tsx`):** solid `bg-card` (not `bg-muted/30`),
  crisp right border, a small logo mark + "Life OS" wordmark at top, footer row
  holding the theme toggle and the pomodoro badge.
- **Nav (`components/nav-tree.tsx`):** group/section labels in uppercase,
  smaller, `tracking-wide`, muted. Active leaf gets an indigo treatment: indigo
  text + faint indigo background + a left accent bar (e.g. a `before:` pseudo or
  a small left border). Hover states use the indigo-tinted `accent` token.
  Keep all existing routing/grouping logic untouched.
- **PageHeader (`components/page-header.tsx`):** new presentational component —
  a title (and optional `description` + `actions` slot) rendered as a top bar
  with a bottom border, consistent padding. Pages opt in by rendering it; it is
  added to a few representative pages as examples, not retrofitted everywhere in
  this effort.

### 4. UI primitive polish (`components/ui/*`)

- `card.tsx`: ensure a crisp `border` + `shadow-sm`; consistent padding. No prop
  changes.
- Focus-visible rings pick up the indigo `--ring` automatically; verify button
  and input focus states look right in both modes.

## Risks / notes

- Dropping the serif removes the current "personal journal" character — this is
  intended per the chosen direction, but it is the most noticeable single
  change.
- `next-themes` is currently imported only by `sonner`; mounting the provider
  activates the dark tokens for the first time, so dark mode must be eyeballed
  across pages.
- Token changes are global: a bad neutral/contrast value affects every screen.
  Verify contrast in both light and dark before finishing.

## Verification

- App builds and runs.
- Light and dark both render correctly across a sample of pages (a task page,
  finance overview with charts, a form page).
- Theme toggle switches and persists across reload.
- Active nav item reads as indigo in both modes; focus rings are indigo.
- No console/hydration warnings from the theme provider.

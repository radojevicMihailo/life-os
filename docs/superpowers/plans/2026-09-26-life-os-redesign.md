# Life OS Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved personal cockpit home page and a consistent dark blue visual language across Life OS.

**Architecture:** Root color tokens and navigation define the shared shell. The home page reads existing habits, savings goals, tasks, and selected calendar events on the server. Module screens retain their behavior and inherit the shell and common component styles.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, shadcn, Drizzle, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-life-os-redesign-design.md`

## Global Constraints

- Do not commit changes.
- Keep all existing routes and actions functional.
- No new database tables or dependencies.
- Do not add focus timer, top-three tasks, weather, or finance chart to the home page.

## Review Focus

- Empty datasets render useful empty states without fabricated values.
- Calendar integration failure does not hide the rest of the dashboard.
- Scheduled habits and plan items use the current Belgrade day.
- Long names and currency values do not overflow cards on mobile.
- Keyboard focus and mobile navigation remain usable.

---

### Task 1: Shared visual shell

**Files:** `app/globals.css`, `app/layout.tsx`, `components/sidebar.tsx`, `components/mobile-nav.tsx`, `components/nav-tree.tsx`, `components/main-sections.ts`, `components/page-header.tsx`, `components/section-links.tsx`, `app/manifest.ts`.

**Interfaces:** Existing route paths and component exports remain unchanged. CSS tokens provide background, foreground, primary, border, card, muted, and sidebar colors.

- [x] Read the installed Next.js App Router CSS and layout guides.
- [x] Change color tokens and global surfaces; default theme to dark and retain light mode.
- [x] Restyle desktop and mobile navigation, headings, and section links with active and focus states.
- [x] Run `pnpm typecheck` and focused navigation checks.

### Task 2: Live personal cockpit home

**Files:** `app/page.tsx`, `app/_lib/dashboard.ts`, `app/navigation.test.ts`, `public/images/home-hero.webp`.

**Interfaces:** `loadHomeDashboard()` returns today's scheduled habits, active finance goals, and today's plan items. The server page renders all regions and empty states with links to source modules.

- [x] Add the approved landscape asset to `public/images`.
- [x] Query existing habit logs, finance goals, scheduled task actions, and selected calendar events without new storage.
- [x] Render hero, habits, financial goals, plan, and text-only motivational card.
- [x] Replace the old module-directory home assertion with tests for dashboard states and navigation.
- [x] Run focused tests, typecheck, and a production build.

### Task 3: Existing module surfaces

**Files:** `app/finance/layout.tsx`, `modules/finance/ui/components/app-nav.tsx`, finance pages and forms with legacy teal accents, plus common UI components used by tasks, habits, goals, meals, notes, physical activity, and travels.

**Interfaces:** Keep form actions, read models, and route URLs intact; only visual classes and copy change.

- [x] Align finance page and form accent classes to the new blue system.
- [x] Check every module landing page for the shared panel, heading, and empty-state language.
- [x] Check mobile and desktop layouts on representative dense routes.
- [x] Run typecheck, lint, relevant tests, and production build; inspect the final diff.

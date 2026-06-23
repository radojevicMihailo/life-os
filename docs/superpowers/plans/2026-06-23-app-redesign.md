# App Redesign (Modern Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole app to a modern-dashboard look (indigo accent, slate-tinted neutrals, sans headings) and rework the shell, with a working light/dark toggle.

**Architecture:** Almost everything flows from CSS custom properties in `app/globals.css`. Changing the token values restyles every page at once. The shell (sidebar, nav, page header) and a mounted `next-themes` provider build on top of those tokens. No page-level layout rework.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4 (CSS-first `@theme`), shadcn-style UI components, `next-themes`, lucide-react icons.

## Global Constraints

- This Next.js (v16) differs from training data — read `node_modules/next/dist/docs/` before writing framework code if unsure.
- Keep `font-size: 20px` on `html` (airy scale stays — do NOT change it).
- Default theme is **light**; toggle switches to dark and persists; `enableSystem` is **false**.
- Accent is **indigo**; neutrals are **slate-tinted** (hue ~265), not pure gray.
- Preserve all existing nav routing/grouping logic — only styling changes there.
- Do NOT rework individual page layouts. Pages inherit the look via tokens/components.
- Commit after each task. Co-author trailer on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `app/globals.css` — color tokens (light + dark), radius, font var chain. (modify)
- `app/layout.tsx` — drop Marcellus, mount theme provider, `suppressHydrationWarning`. (modify)
- `components/theme-provider.tsx` — client wrapper around next-themes. (create)
- `components/theme-toggle.tsx` — sun/moon toggle button. (create)
- `components/sidebar.tsx` — solid surface, logo mark, footer with toggle. (modify)
- `components/nav-tree.tsx` — uppercase section labels, indigo active state. (modify)
- `components/page-header.tsx` — shared page title bar. (create)
- `components/ui/card.tsx` — crisp border + shadow. (modify, if needed)
- A couple of representative pages — render `PageHeader` as examples. (modify)

---

### Task 1: Color tokens + radius in globals.css

**Files:**
- Modify: `app/globals.css` (the `:root`, `.dark` blocks, and `--radius`)

**Interfaces:**
- Produces: indigo `--primary`/`--ring`, slate-tinted neutrals, colored `--chart-*`, indigo sidebar accent tokens. All consumed implicitly by every component via Tailwind theme mapping.

- [ ] **Step 1: Replace the `:root` block** in `app/globals.css` with these values (keep every variable name; only values change):

```css
:root {
  --background: oklch(0.99 0.002 265);
  --foreground: oklch(0.16 0.01 265);
  --card: oklch(1 0.001 265);
  --card-foreground: oklch(0.16 0.01 265);
  --popover: oklch(1 0.001 265);
  --popover-foreground: oklch(0.16 0.01 265);
  --primary: oklch(0.51 0.20 269);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0.004 265);
  --secondary-foreground: oklch(0.21 0.01 265);
  --muted: oklch(0.97 0.004 265);
  --muted-foreground: oklch(0.52 0.02 265);
  --accent: oklch(0.96 0.012 269);
  --accent-foreground: oklch(0.32 0.12 269);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.006 265);
  --input: oklch(0.92 0.006 265);
  --ring: oklch(0.51 0.20 269);
  --chart-1: oklch(0.55 0.20 269);
  --chart-2: oklch(0.62 0.19 300);
  --chart-3: oklch(0.65 0.15 230);
  --chart-4: oklch(0.70 0.13 195);
  --chart-5: oklch(0.68 0.13 165);
  --radius: 0.5rem;
  --sidebar: oklch(0.99 0.003 265);
  --sidebar-foreground: oklch(0.16 0.01 265);
  --sidebar-primary: oklch(0.51 0.20 269);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.96 0.012 269);
  --sidebar-accent-foreground: oklch(0.32 0.12 269);
  --sidebar-border: oklch(0.92 0.006 265);
  --sidebar-ring: oklch(0.51 0.20 269);
}
```

- [ ] **Step 2: Replace the `.dark` block** with:

```css
.dark {
  --background: oklch(0.16 0.01 265);
  --foreground: oklch(0.985 0.002 265);
  --card: oklch(0.20 0.012 265);
  --card-foreground: oklch(0.985 0.002 265);
  --popover: oklch(0.20 0.012 265);
  --popover-foreground: oklch(0.985 0.002 265);
  --primary: oklch(0.62 0.19 269);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.27 0.015 265);
  --secondary-foreground: oklch(0.985 0.002 265);
  --muted: oklch(0.27 0.015 265);
  --muted-foreground: oklch(0.70 0.02 265);
  --accent: oklch(0.27 0.03 269);
  --accent-foreground: oklch(0.92 0.03 269);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.62 0.19 269);
  --chart-1: oklch(0.62 0.19 269);
  --chart-2: oklch(0.66 0.18 300);
  --chart-3: oklch(0.68 0.14 230);
  --chart-4: oklch(0.72 0.13 195);
  --chart-5: oklch(0.70 0.13 165);
  --sidebar: oklch(0.18 0.012 265);
  --sidebar-foreground: oklch(0.985 0.002 265);
  --sidebar-primary: oklch(0.62 0.19 269);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.27 0.03 269);
  --sidebar-accent-foreground: oklch(0.92 0.03 269);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.62 0.19 269);
}
```

- [ ] **Step 3: Verify build compiles**

Run: `pnpm build`
Expected: build succeeds (CSS valid, no oklch syntax errors).

- [ ] **Step 4: Eyeball light mode**

Run: `pnpm dev`, open `http://localhost:3000`. Expect indigo buttons/links, faint slate tint on surfaces, indigo focus ring when tabbing to a button.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "$(printf 'feat(theme): indigo accent + slate neutrals + colored charts\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: Typography — drop Marcellus serif

**Files:**
- Modify: `app/globals.css` (font var chain)
- Modify: `app/layout.tsx` (remove Marcellus import/loader/variable)

**Interfaces:**
- Consumes: nothing.
- Produces: `--font-sans` and `--font-heading` both resolve to Geist sans.

- [ ] **Step 1: Update the font vars** in `app/globals.css` `@theme inline` block — remove `var(--font-marcellus)` from both chains:

```css
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
```

- [ ] **Step 2: Remove Marcellus from `app/layout.tsx`** — delete the `Marcellus` import, its loader `const marcellus = ...`, and `${marcellus.variable}` from the `<html>` className. Update the import line to:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
```

- [ ] **Step 3: Verify build + typecheck**

Run: `pnpm build && pnpm typecheck`
Expected: both pass; no unused-var error for `marcellus`.

- [ ] **Step 4: Eyeball** — headings now render in bold Geist sans, not serif.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "$(printf 'feat(theme): drop Marcellus serif, use Geist sans for headings\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: Theme provider + toggle, mounted in layout

**Files:**
- Create: `components/theme-provider.tsx`
- Create: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `ThemeProvider` (default export-style named component) and `ThemeToggle` component. `ThemeToggle` is consumed by the sidebar in Task 4.

- [ ] **Step 1: Create `components/theme-provider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Create `components/theme-toggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
```

- [ ] **Step 3: Mount provider in `app/layout.tsx`** — add `suppressHydrationWarning` to `<html>`, import `ThemeProvider`, and wrap the app. The body subtree becomes:

```tsx
import { ThemeProvider } from "@/components/theme-provider";
// ...
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <PomodoroProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-6 md:p-8">{children}</main>
            </div>
            <Toaster richColors position="top-right" />
            <KeyboardShortcuts />
          </PomodoroProvider>
        </ThemeProvider>
      </body>
```

And add `suppressHydrationWarning` to the opening `<html ...>` tag.

- [ ] **Step 4: Verify build + typecheck**

Run: `pnpm build && pnpm typecheck`
Expected: pass, no hydration-related type errors.

- [ ] **Step 5: Commit**

```bash
git add components/theme-provider.tsx components/theme-toggle.tsx app/layout.tsx
git commit -m "$(printf 'feat(theme): mount next-themes provider + toggle component\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: Sidebar rework

**Files:**
- Modify: `components/sidebar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from Task 3, existing `NavTree`, `PomodoroBadge`.

- [ ] **Step 1: Rewrite `components/sidebar.tsx`** to a solid surface with a logo mark and a footer row holding the toggle + badge:

```tsx
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { NavTree } from "@/components/nav-tree";
import { PomodoroBadge } from "@/components/pomodoro-badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          Life OS
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-4 px-3 pb-4">
        <NavTree />
      </nav>
      <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-2">
        <ThemeToggle />
        <PomodoroBadge />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: pass.

- [ ] **Step 3: Eyeball** — sidebar has a solid surface, indigo logo chip, and a footer row with the theme toggle; clicking the toggle flips light/dark and the choice survives reload.

- [ ] **Step 4: Commit**

```bash
git add components/sidebar.tsx
git commit -m "$(printf 'feat(shell): rework sidebar with logo mark + theme toggle footer\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: Nav-tree active + section styling

**Files:**
- Modify: `components/nav-tree.tsx`

**Interfaces:**
- Consumes: nothing new. Preserve all routing/grouping logic; only class strings change.

- [ ] **Step 1: Style group toggle buttons as uppercase section labels.** Replace the group `<button>` className with:

```tsx
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
```

- [ ] **Step 2: Style the active leaf with an indigo left bar.** Replace the leaf `<Link>` className expression (top-level leaves) with:

```tsx
                className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
                    : "text-sidebar-foreground/80"
                }`}
```

- [ ] **Step 3: Style child leaves the same way.** Replace the child `<Link>` className expression with:

```tsx
                        className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-3.5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
                            : "text-sidebar-foreground/70"
                        }`}
```

- [ ] **Step 4: Verify build + typecheck**

Run: `pnpm build && pnpm typecheck`
Expected: pass.

- [ ] **Step 5: Eyeball** — navigate between pages; active item shows indigo text + faint indigo bg + a short indigo left bar. Section headers read as uppercase muted labels.

- [ ] **Step 6: Commit**

```bash
git add components/nav-tree.tsx
git commit -m "$(printf 'feat(shell): indigo active nav state + uppercase section labels\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: PageHeader component + apply to sample pages

**Files:**
- Create: `components/page-header.tsx`
- Modify: 2 representative pages (whichever top-level pages exist, e.g. `app/goals/page.tsx` and `app/travels/page.tsx`)

**Interfaces:**
- Produces: `PageHeader` with props `{ title: string; description?: string; actions?: React.ReactNode }`.

- [ ] **Step 1: Create `components/page-header.tsx`**

```tsx
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b pb-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Identify two simple pages.** Run: `ls app/goals/page.tsx app/travels/page.tsx`. Open each and find its existing top-of-page heading.

- [ ] **Step 3: Replace each page's ad-hoc heading** with `<PageHeader title="..." />` (use the page's existing title text; add a short `description` if obvious). Import: `import { PageHeader } from "@/components/page-header";`.

- [ ] **Step 4: Verify build + typecheck**

Run: `pnpm build && pnpm typecheck`
Expected: pass.

- [ ] **Step 5: Eyeball** the two pages — consistent bold title bar with bottom border.

- [ ] **Step 6: Commit**

```bash
git add components/page-header.tsx app/goals/page.tsx app/travels/page.tsx
git commit -m "$(printf 'feat(shell): add PageHeader and apply to sample pages\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 7: UI primitive polish + dark-mode pass

**Files:**
- Modify: `components/ui/card.tsx` (only if it lacks border/shadow)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Inspect card.** Run: `sed -n '1,40p' components/ui/card.tsx`. Confirm the root has `rounded-xl border bg-card shadow-sm` (or equivalent). If `shadow-sm` or `border` is missing from the root element, add it to the root className; otherwise make no change.

- [ ] **Step 2: Full dark-mode eyeball.** Run `pnpm dev`, toggle to dark, and visit: a task page, `finance/overview` (charts must show indigo/violet/etc, not gray), and one form page. Check text contrast and that cards/borders are visible.

- [ ] **Step 3: Verify build + typecheck + tests**

Run: `pnpm build && pnpm typecheck && pnpm test`
Expected: all pass.

- [ ] **Step 4: Commit (only if files changed)**

```bash
git add -A
git commit -m "$(printf 'feat(theme): polish card surface + verify dark mode\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Self-Review

**Spec coverage:**
- Color tokens (indigo, slate neutrals, charts, radius) → Task 1 ✓
- Typography (drop serif, keep 20px) → Task 2 ✓ (20px untouched per Global Constraints)
- Theme provider + toggle, light default, no system → Task 3 ✓
- Sidebar rework → Task 4 ✓
- Nav active/section styling → Task 5 ✓
- PageHeader (sample pages only) → Task 6 ✓
- Card/focus polish + dark-mode verification → Task 7 ✓

**Placeholder scan:** No TBD/TODO; all code blocks concrete. Card change is conditional with an explicit inspect step. ✓

**Type consistency:** `PageHeader` props match between definition and usage; `ThemeProvider`/`ThemeToggle` names consistent across Tasks 3–4. ✓

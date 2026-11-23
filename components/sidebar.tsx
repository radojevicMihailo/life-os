import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { NavTree } from "@/components/nav-tree";
import { PomodoroBadge } from "@/components/pomodoro-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsLink } from "@/components/settings-link";
import { LogoutButton } from "@/components/logout-button";
import { SearchButton } from "@/components/command-palette";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-48 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex lg:w-52">
      <div className="px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <BrandMark className="size-8 rounded-lg" />
          <span>Life OS</span>
        </Link>
      </div>
      <div className="px-3 pb-4"><SearchButton /></div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Glavna navigacija">
        <NavTree />
      </nav>
      <div className="px-3 pb-2"><SettingsLink /></div>
      <div className="flex min-w-0 items-center gap-2 border-t border-sidebar-border px-3 py-3">
        <ThemeToggle />
        <PomodoroBadge />
        <LogoutButton />
      </div>
    </aside>
  );
}

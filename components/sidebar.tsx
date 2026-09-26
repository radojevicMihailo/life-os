import Link from "next/link";
import { Sparkles } from "lucide-react";
import { NavTree } from "@/components/nav-tree";
import { PomodoroBadge } from "@/components/pomodoro-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-5 py-7">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 via-blue-500 to-cyan-300 text-white shadow-[0_0_22px_rgba(35,123,255,0.5)]">
            <Sparkles className="size-5" />
          </span>
          <span>Life OS<small className="block text-[0.65rem] font-normal tracking-normal text-muted-foreground">Bolji ja. Svaki dan.</small></span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Glavna navigacija">
        <NavTree />
      </nav>
      <div className="mx-5 mb-5 border-t border-sidebar-border pt-5 text-xs leading-5 text-muted-foreground"><span className="mb-2 block h-0.5 w-9 bg-primary" />Mali koraci,<br />velike promene.</div>
      <div className="flex min-w-0 items-center gap-2 border-t border-sidebar-border px-3 py-3">
        <ThemeToggle />
        <PomodoroBadge />
        <LogoutButton />
      </div>
    </aside>
  );
}

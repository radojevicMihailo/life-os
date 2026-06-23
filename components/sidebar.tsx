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

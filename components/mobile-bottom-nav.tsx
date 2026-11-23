"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ListTodo, MoreHorizontal, Plus } from "lucide-react";
import { mainSections } from "./main-sections";
import { useAppearance } from "./appearance-settings";
import { OPEN_COMMANDS } from "./command-palette";

const itemClass = "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[0.65rem] text-sidebar-foreground/80 focus-visible:outline-2 focus-visible:outline-sidebar-ring aria-[current=page]:text-primary dark:aria-[current=page]:text-(--action)";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { favorites } = useAppearance();
  if (pathname === "/access") return null;

  const choices = [{ href: "/tasks", label: "Zadaci", icon: ListTodo }, ...mainSections];
  const links = [{ href: "/", label: "Danas", icon: House }, ...favorites.map((href) => choices.find((item) => item.href === href)).filter((item) => item !== undefined)];

  return (
    <nav aria-label="Brza navigacija" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-sidebar-border bg-sidebar px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      {links.map((item) => (
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={itemClass}>
          <item.icon aria-hidden className="size-5" />
          <span className="max-w-full truncate">{item.label}</span>
        </Link>
      ))}
      <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COMMANDS))} className={itemClass}><Plus aria-hidden className="size-5 text-sidebar-primary" />Dodaj</button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("life-os:mobile-menu"))} className={itemClass}><MoreHorizontal aria-hidden className="size-5" />Više</button>
    </nav>
  );
}

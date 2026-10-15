"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ListTodo, MoreHorizontal, Plus } from "lucide-react";
import { mainSections } from "./main-sections";
import { useAppearance } from "./appearance-settings";
import { OPEN_COMMANDS } from "./command-palette";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { favorites } = useAppearance();
  if (pathname === "/access") return null;
  const choices = [{ href: "/tasks", label: "Zadaci", icon: ListTodo }, ...mainSections];
  const links = [{ href: "/", label: "Danas", icon: House }, ...favorites.map((href) => choices.find((item) => item.href === href)).filter((item) => item !== undefined)];
  return <nav aria-label="Brza navigacija" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-sidebar/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
    {links.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] ${pathname === item.href ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><item.icon aria-hidden className="size-5" />{item.label}</Link>)}
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COMMANDS))} className="flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] text-primary"><Plus aria-hidden className="size-5" />Dodaj</button>
    <button type="button" onClick={() => window.dispatchEvent(new Event("life-os:mobile-menu"))} className="flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] text-muted-foreground"><MoreHorizontal aria-hidden className="size-5" />Više</button>
  </nav>;
}

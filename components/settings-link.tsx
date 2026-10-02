"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2 } from "lucide-react";

export function SettingsLink({ onClick }: { onClick?: () => void }) {
  const active = usePathname() === "/settings";
  return <Link href="/settings" onClick={onClick} aria-current={active ? "page" : undefined}
    className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent"}`}>
    <Settings2 className="size-4" />Podešavanja
  </Link>;
}

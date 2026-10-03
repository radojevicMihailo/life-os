"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { NavTree } from "@/components/nav-tree";
import { PomodoroBadge } from "@/components/pomodoro-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsLink } from "@/components/settings-link";
import { LogoutButton } from "@/components/logout-button";

export function MobileNav() {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState({ pathname, open: false });
  const open = drawer.pathname === pathname && drawer.open;
  const setOpen = (nextOpen: boolean) => setDrawer({ pathname, open: nextOpen });

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-sidebar-border bg-sidebar/95 px-4 text-sidebar-foreground backdrop-blur-xl md:hidden">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          className="flex size-10 items-center justify-center rounded-xl transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <DialogPrimitive.Title asChild>
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <BrandMark className="size-9 rounded-lg" />
                  Life OS
                </Link>
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="flex size-8 items-center justify-center rounded-md transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
              <NavTree />
            </nav>
            <div className="px-3 pb-2"><SettingsLink onClick={() => setOpen(false)} /></div>
            <div className="flex min-w-0 items-center gap-2 border-t border-sidebar-border px-3 py-2">
              <ThemeToggle />
              <PomodoroBadge />
              <LogoutButton />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <BrandMark className="size-8 rounded-lg" />
        Life OS
      </Link>
    </header>
  );
}

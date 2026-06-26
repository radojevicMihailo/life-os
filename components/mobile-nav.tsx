"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Menu, Sparkles, X } from "lucide-react";
import { NavTree } from "@/components/nav-tree";
import { PomodoroBadge } from "@/components/pomodoro-badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:hidden">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          className="flex size-9 items-center justify-center rounded-md transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <DialogPrimitive.Title asChild>
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </span>
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
            <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-2">
              <ThemeToggle />
              <PomodoroBadge />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </span>
        Life OS
      </Link>
    </header>
  );
}

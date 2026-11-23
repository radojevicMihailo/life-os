"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { quickLinks } from "@/components/command-palette";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function DashboardQuickAdd() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex min-h-11 shrink-0 items-center gap-2 action-button rounded-lg px-3.5 text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-white">
        <Plus aria-hidden className="size-4" />
        Dodaj
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-44">
        {quickLinks.map(({ href, title }) => (
          <DropdownMenuItem key={href} asChild className="min-h-10 cursor-pointer px-2">
            <Link href={href}>{title}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

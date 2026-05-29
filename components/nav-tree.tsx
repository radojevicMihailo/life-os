"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  CalendarDays,
  Wallet,
  Activity,
  Repeat,
  Target,
  UtensilsCrossed,
  CheckSquare,
  ChevronRight,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;
type LeafItem = { href: string; label: string; icon: IconType };

type Section =
  | { kind: "leaf"; href: string; label: string; icon: IconType }
  | {
      kind: "group";
      id: string;
      label: string;
      icon: IconType;
      children: LeafItem[];
    };

const taskChildren: LeafItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const taskPaths = new Set(["/", "/tasks", "/projects", "/context", "/priorities", "/calendar"]);

function isTaskRoute(pathname: string): boolean {
  if (taskPaths.has(pathname)) return true;
  return (
    pathname.startsWith("/tasks/") ||
    pathname.startsWith("/projects/") ||
    pathname.startsWith("/context/") ||
    pathname.startsWith("/priorities/") ||
    pathname.startsWith("/calendar/")
  );
}

export function NavTree() {
  const pathname = usePathname() ?? "/";
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    tasks: isTaskRoute(pathname),
  });

  const sections: Section[] = [
    {
      kind: "group",
      id: "tasks",
      label: "Task Manager",
      icon: CheckSquare,
      children: taskChildren,
    },
    { kind: "leaf", href: "/finance", label: "Finance", icon: Wallet },
    { kind: "leaf", href: "/physical", label: "Physical Activities", icon: Activity },
    { kind: "leaf", href: "/habits", label: "Habits", icon: Repeat },
    { kind: "leaf", href: "/goals", label: "Goals", icon: Target },
    { kind: "leaf", href: "/meals", label: "Meals Diary", icon: UtensilsCrossed },
  ];

  function toggle(id: string) {
    setOpenGroups((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <ul className="space-y-0.5">
      {sections.map((s) => {
        if (s.kind === "leaf") {
          const Icon = s.icon;
          const active = pathname === s.href;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-accent hover:text-foreground ${
                  active ? "bg-accent text-foreground" : "text-foreground/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{s.label}</span>
              </Link>
            </li>
          );
        }
        const Icon = s.icon;
        const open = openGroups[s.id] ?? false;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 transition hover:bg-accent hover:text-foreground"
              aria-expanded={open}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{s.label}</span>
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
              />
            </button>
            {open && (
              <ul className="mt-1 space-y-0.5 pl-4">
                {s.children.map((c) => {
                  const CIcon = c.icon;
                  const active = pathname === c.href;
                  return (
                    <li key={c.href}>
                      <Link
                        href={c.href}
                        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition hover:bg-accent hover:text-foreground ${
                          active ? "bg-accent text-foreground" : "text-foreground/70"
                        }`}
                      >
                        <CIcon className="h-3.5 w-3.5" />
                        <span>{c.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

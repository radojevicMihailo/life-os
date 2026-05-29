import Link from "next/link";
import { LayoutDashboard, ListTodo, FolderKanban, Tags } from "lucide-react";
import { ProjectSidebar } from "@/app/(tasks)/_components/ProjectSidebar";

const modules = [
  {
    label: "Tasks",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/tags", label: "Tags", icon: Tags },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Life-OS
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 px-3">
        {modules.map((mod) => (
          <div key={mod.label}>
            <div className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {mod.label}
            </div>
            <ul className="space-y-0.5">
              {mod.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 transition hover:bg-accent hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <ProjectSidebar />
      </nav>
    </aside>
  );
}

import Link from "next/link";
import { NavTree } from "@/components/nav-tree";

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Life-OS
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-4 px-3 pb-4">
        <NavTree />
      </nav>
    </aside>
  );
}

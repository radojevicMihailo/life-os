import type { ReactNode } from "react";
import { SectionNav } from "@/components/section-nav";

export default function TasksLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0"><SectionNav area="tasks" />{children}</div>;
}

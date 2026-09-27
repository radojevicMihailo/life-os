import type { ReactNode } from "react";
import { SectionNav } from "@/components/section-nav";

export default function PomodoroLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0"><SectionNav area="tasks" />{children}</div>;
}

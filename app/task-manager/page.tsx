import { sections } from "@/components/main-sections";
import { SectionLinks } from "@/components/section-links";

export default function TaskManagerPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Task Manager</h1>
        <p className="text-sm text-muted-foreground">{sections.tasks.description}</p>
      </header>
      <SectionLinks section={sections.tasks} />
    </div>
  );
}

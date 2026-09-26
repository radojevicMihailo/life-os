import { sections } from "@/components/main-sections";
import { SectionLinks } from "@/components/section-links";

export default function PhysicalPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Physical Activities</h1>
        <p className="text-sm text-muted-foreground">{sections.physical.description}</p>
      </header>
      <SectionLinks section={sections.physical} />
    </div>
  );
}

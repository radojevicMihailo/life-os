import { sections } from "@/components/main-sections";
import { SectionOverview } from "@/components/section-overview";

export default function TaskManagerPage() {
  return <SectionOverview section={sections.tasks} />;
}

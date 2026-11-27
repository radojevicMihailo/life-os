import type { MainSection } from "@/components/main-sections";
import { PageHeader } from "@/components/page-header";
import { SectionLinks } from "@/components/section-links";

export function SectionOverview({ section }: { section: MainSection }) {
  return (
    <>
      <PageHeader title={section.label} description={section.description} />
      <SectionLinks section={section} />
    </>
  );
}

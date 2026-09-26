import { format } from "date-fns";
import { DayView } from "./_components/DayView";
import { sections } from "@/components/main-sections";
import { SectionLinks } from "@/components/section-links";

export default function MealsTodayPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="px-6 pt-6">
        <SectionLinks section={sections.meals} />
      </div>
      <DayView date={format(new Date(), "yyyy-MM-dd")} />
    </div>
  );
}

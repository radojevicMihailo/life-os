import { belgradeDayKey } from "@/lib/day";
import { DayView } from "./_components/DayView";
import { sections } from "@/components/main-sections";
import { SectionLinks } from "@/components/section-links";

export default function MealsTodayPage() {
  return (
    <div className="min-w-0">
      <div className="pt-6">
        <SectionLinks section={sections.meals} />
      </div>
      <DayView date={belgradeDayKey(new Date())} />
    </div>
  );
}

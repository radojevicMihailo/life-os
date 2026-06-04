import { format } from "date-fns";
import { DayView } from "./_components/DayView";

export default function MealsTodayPage() {
  return <DayView date={format(new Date(), "yyyy-MM-dd")} />;
}

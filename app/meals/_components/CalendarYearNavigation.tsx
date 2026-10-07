"use client";

import { useRouter } from "next/navigation";
import { CalendarYearSelect } from "@/components/ui/calendar-year-select";

export function CalendarYearNavigation({ month }: { month: string }) {
  const router = useRouter();
  return <CalendarYearSelect year={Number(month.slice(0, 4))} onYearChange={(year) => {
    router.push(`/meals/calendar?month=${year}-${month.slice(5, 7)}`);
  }} />;
}

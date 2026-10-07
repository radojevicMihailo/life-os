"use client";

import { useRouter } from "next/navigation";
import { CalendarPeriodSelect } from "@/components/ui/calendar-period-select";

export function CalendarPeriodNavigation({ month }: { month: string }) {
  const router = useRouter();
  return <CalendarPeriodSelect month={Number(month.slice(5, 7)) - 1} year={Number(month.slice(0, 4))} onMonthChange={(value) => {
    router.push(`/meals/calendar?month=${month.slice(0, 4)}-${String(value + 1).padStart(2, "0")}`);
  }} onYearChange={(year) => {
    router.push(`/meals/calendar?month=${year}-${month.slice(5, 7)}`);
  }} />;
}

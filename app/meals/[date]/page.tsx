import { z } from "zod";
import { notFound } from "next/navigation";
import { DayView } from "../_components/DayView";

export default async function MealsDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!z.iso.date().safeParse(date).success) notFound();
  return <DayView date={date} />;
}

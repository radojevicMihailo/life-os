import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema/settings";

export const getSelectedGoogleCalendars = cache(async (): Promise<string[]> => {
  const [row] = await db
    .select({ ids: appSettings.googleCalendarIds })
    .from(appSettings)
    .where(eq(appSettings.id, 1));
  return row?.ids ?? [];
});

export async function setSelectedGoogleCalendars(ids: string[]): Promise<void> {
  await db
    .update(appSettings)
    .set({ googleCalendarIds: ids, updatedAt: sql`now()` })
    .where(eq(appSettings.id, 1));
}

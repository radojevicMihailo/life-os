import { asc } from "drizzle-orm";
import { db } from "@/db";
import { noteCategory } from "@/db/schema/notes";
import { PageHeader } from "@/components/page-header";
import { NoteCategoriesSettings } from "../_components/NoteCategoriesSettings";

export const dynamic = "force-dynamic";

export default async function NotesSettingsPage() {
  const categories = await db.select({ id: noteCategory.id, name: noteCategory.name }).from(noteCategory).orderBy(asc(noteCategory.name));
  return <div className="space-y-6"><PageHeader title="Podešavanja beležaka" description="Organizuj beleške u kategorije." /><NoteCategoriesSettings categories={categories} /></div>;
}

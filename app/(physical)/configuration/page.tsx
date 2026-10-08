import {
  getExerciseGroups,
  getExercises,
  getTagGroupsWithTags,
} from "@/lib/queries/physical";
import { Separator } from "@/components/ui/separator";
import { TagGroupEditor } from "../_components/TagGroupEditor";
import { ExerciseGroupEditor } from "../_components/ExerciseGroupEditor";
import { ExerciseEditor } from "../_components/ExerciseEditor";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const [tagSections, groups, exercises] = await Promise.all([
    getTagGroupsWithTags(),
    getExerciseGroups(),
    getExercises(),
  ]);

  const editorSections = tagSections.map((s) => ({ group: s.group, tags: s.tags }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Konfiguracija</h1>
        <p className="text-sm text-muted-foreground">
          Grupe opisa treninga, grupe vežbi i katalog vežbi.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Opis treninga</h2>
        <p className="text-xs text-muted-foreground">
          Podesi svoje grupe, na primer region ili vrstu trčanja, i izaberi da li se prikazuju na celom treningu ili njegovim delovima.
        </p>
        <TagGroupEditor sections={editorSections} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Grupe vežbi</h2>
        <p className="text-xs text-muted-foreground">Grupe su zajedničke za sve treninge.</p>
        <ExerciseGroupEditor groups={groups} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vežbe</h2>
        <p className="text-xs text-muted-foreground">Svaka vežba ima naziv i opcionu grupu.</p>
        <ExerciseEditor groups={groups} exercises={exercises} />
      </section>

      <ScrollToTopButton />
    </div>
  );
}

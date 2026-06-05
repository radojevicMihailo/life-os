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
        <h1 className="text-2xl font-semibold">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Activity tag groups, exercise groups, and exercises.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity tag groups</h2>
        <p className="text-xs text-muted-foreground">
          Define tag-groups (e.g. Intent, Region, Pace). When logging activity, pick zero or more tags across groups.
        </p>
        <TagGroupEditor sections={editorSections} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Exercise groups</h2>
        <p className="text-xs text-muted-foreground">Groups are global.</p>
        <ExerciseGroupEditor groups={groups} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Exercises</h2>
        <p className="text-xs text-muted-foreground">Each exercise has a name and an optional group.</p>
        <ExerciseEditor groups={groups} exercises={exercises} />
      </section>

      <ScrollToTopButton />
    </div>
  );
}

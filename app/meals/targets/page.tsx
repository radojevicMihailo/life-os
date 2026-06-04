import { TargetsForm } from "../_components/TargetsForm";
import { getMealTargets } from "../_actions/settings";

export default async function MealTargetsPage() {
  const targets = await getMealTargets();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Daily targets</h1>
      <TargetsForm initial={targets} />
    </div>
  );
}

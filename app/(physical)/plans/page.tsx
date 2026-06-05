import Link from "next/link";
import { Dumbbell, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function PlansPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="text-sm text-muted-foreground">Workout templates and training splits.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/plans/workouts">
          <Card className="px-5 py-6 hover:bg-accent">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-6 w-6" />
              <div>
                <div className="text-base font-medium">Workout plans</div>
                <p className="text-xs text-muted-foreground">Gym templates: exercises and set counts.</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/plans/splits">
          <Card className="px-5 py-6 hover:bg-accent">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6" />
              <div>
                <div className="text-base font-medium">Splits</div>
                <p className="text-xs text-muted-foreground">Ordered day rotations of tagged sessions.</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

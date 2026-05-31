import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getModalities } from "@/lib/queries/physical";
import { Card } from "@/components/ui/card";
import { ModalityForm } from "../_components/ModalityForm";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const modalities = await getModalities(true);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Modalities, fields, categories, and exercises.
          </p>
        </div>
        <ModalityForm />
      </div>

      {modalities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No modalities yet. Create one to begin.</p>
      ) : (
        <ul className="space-y-2">
          {modalities.map((m) => (
            <li key={m.id}>
              <Link href={`/configuration/${m.id}`}>
                <Card className="flex items-center justify-between px-4 py-3 hover:bg-accent">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    {m.archivedAt ? (
                      <div className="text-xs text-muted-foreground">Archived</div>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

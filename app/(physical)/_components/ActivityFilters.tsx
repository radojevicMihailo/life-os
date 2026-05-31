"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Modality } from "@/db/schema/physical";

const ALL = "__all__";

export function ActivityFilters({ modalities }: { modalities: Modality[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const modality = params.get("modality") ?? ALL;

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    router.push(`/activities?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Modality</span>
      <Select value={modality} onValueChange={(v) => set("modality", v)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {modalities.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

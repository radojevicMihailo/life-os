"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  travelRegionLabel,
  travelStatusLabel,
  type Travel,
  type TravelRegion,
  type TravelStatus,
} from "@/db/schema/travels";
import {
  deleteTravel,
  setTravelRegion,
  setTravelStatus,
} from "../_actions/travels";
import { TravelEditDialog } from "./TravelEditDialog";
import { travelRegionColors, travelStatusColors } from "@/lib/status-colors";

const REGIONS: TravelRegion[] = ["srbija", "okolne_drzave", "evropa", "svet"];
const STATUSES: TravelStatus[] = ["idea", "planning", "booked", "done"];

function fmt(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(day));
  return date.toLocaleDateString("sr-Latn-RS", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dateRange(t: Travel): string {
  if (!t.startDate && !t.endDate) return "—";
  if (t.startDate && t.endDate) return `${fmt(t.startDate)} → ${fmt(t.endDate)}`;
  return fmt(t.startDate ?? t.endDate);
}

export function TravelsTable({ travels, emptyMessage = "Još nema putovanja." }: { travels: Travel[]; emptyMessage?: string }) {
  if (travels.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Naziv</th>
            <th className="px-3 py-2 font-medium">Region</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Datum</th>
            <th className="px-3 py-2 font-medium">Ljudi</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {travels.map((t) => (
            <TravelRow key={t.id} travel={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TravelRow({ travel: t }: { travel: Travel }) {
  const [pending, startTransition] = useTransition();

  function changeRegion(r: TravelRegion) {
    startTransition(async () => {
      const res = await setTravelRegion(t.id, r);
      if (!res.ok) toast.error(res.error);
    });
  }
  function changeStatus(s: TravelStatus) {
    startTransition(async () => {
      const res = await setTravelStatus(t.id, s);
      if (!res.ok) toast.error(res.error);
    });
  }
  function remove() {
    startTransition(async () => {
      const res = await deleteTravel(t.id);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <tr className="group border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-2 font-medium">{t.name}</td>
      <td className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${travelRegionColors[t.region]}`}
              disabled={pending}
            >
              {travelRegionLabel[t.region]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {REGIONS.map((r) => (
              <DropdownMenuItem key={r} onSelect={() => changeRegion(r)}>
                {travelRegionLabel[r]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${travelStatusColors[t.status]}`}
              disabled={pending}
            >
              {travelStatusLabel[t.status]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUSES.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => changeStatus(s)}>
                {travelStatusLabel[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{dateRange(t)}</td>
      <td className="px-3 py-2 text-muted-foreground">{t.people ?? ""}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1"><TravelEditDialog travel={t} compact /><Button
          size="icon"
          variant="ghost"
          onClick={remove}
          disabled={pending}
          className="opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          aria-label={`Obriši ${t.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button></div>
      </td>
    </tr>
  );
}

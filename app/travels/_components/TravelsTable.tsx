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

const REGIONS: TravelRegion[] = ["srbija", "okolne_drzave", "evropa", "svet"];
const STATUSES: TravelStatus[] = ["idea", "planning", "booked", "done"];

const regionBadge: Record<TravelRegion, string> = {
  srbija: "bg-rose-100 text-rose-700 border-rose-300",
  okolne_drzave: "bg-orange-100 text-orange-700 border-orange-300",
  evropa: "bg-sky-100 text-sky-700 border-sky-300",
  svet: "bg-violet-100 text-violet-700 border-violet-300",
};

const statusBadge: Record<TravelStatus, string> = {
  idea: "bg-zinc-100 text-zinc-700 border-zinc-300",
  planning: "bg-amber-100 text-amber-800 border-amber-300",
  booked: "bg-blue-100 text-blue-700 border-blue-300",
  done: "bg-green-100 text-green-700 border-green-300",
};

function fmt(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(day));
  return date.toLocaleDateString(undefined, {
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

export function TravelsTable({ travels }: { travels: Travel[] }) {
  if (travels.length === 0) {
    return <p className="text-sm text-muted-foreground">No travels yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Region</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">People</th>
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
              className={`rounded border px-2 py-0.5 text-xs ${regionBadge[t.region]}`}
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
              className={`rounded border px-2 py-0.5 text-xs ${statusBadge[t.status]}`}
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
        <Button
          size="icon"
          variant="ghost"
          onClick={remove}
          disabled={pending}
          className="opacity-0 transition group-hover:opacity-100"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

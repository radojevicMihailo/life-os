"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { travelRegionLabel, travelStatusLabel, type Travel, type TravelRegion, type TravelStatus } from "@/db/schema/travels";
import { filterAndSortTravels, type TravelFilters } from "@/lib/travels/view";
import { TravelCalendar } from "./TravelCalendar";
import { TravelsTable } from "./TravelsTable";

const regions: TravelRegion[] = ["srbija", "okolne_drzave", "evropa", "svet"];
const statuses: TravelStatus[] = ["idea", "planning", "booked", "done"];
const initialFilters: TravelFilters = { region: "all", status: "all", people: "", sort: "asc" };
const selectClass = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function TravelsWorkspace({ travels, todayKey }: { travels: Travel[]; todayKey: string }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filters, setFilters] = useState<TravelFilters>(initialFilters);
  const visible = filterAndSortTravels(travels, filters);
  const filtering = filters.region !== "all" || filters.status !== "all" || Boolean(filters.people.trim());
  const change = <K extends keyof TravelFilters>(key: K, value: TravelFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{visible.length} od {travels.length} putovanja</p>
      <div role="group" aria-label="Prikaz putovanja" className="flex rounded-xl border border-border bg-card p-1">
        <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-pressed={view === "list"} onClick={() => setView("list")}><List className="size-4" /> Lista</Button>
        <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}><CalendarDays className="size-4" /> Kalendar</Button>
      </div>
    </div>

    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="grid gap-1.5"><Label htmlFor="travel-filter-region">Region</Label><select id="travel-filter-region" className={selectClass} value={filters.region} onChange={(event) => change("region", event.target.value as TravelFilters["region"])}><option value="all">Svi regioni</option>{regions.map((region) => <option key={region} value={region}>{travelRegionLabel[region]}</option>)}</select></div>
      <div className="grid gap-1.5"><Label htmlFor="travel-filter-status">Status</Label><select id="travel-filter-status" className={selectClass} value={filters.status} onChange={(event) => change("status", event.target.value as TravelFilters["status"])}><option value="all">Svi statusi</option>{statuses.map((status) => <option key={status} value={status}>{travelStatusLabel[status]}</option>)}</select></div>
      <div className="grid gap-1.5"><Label htmlFor="travel-filter-people">Ljudi</Label><Input id="travel-filter-people" value={filters.people} onChange={(event) => change("people", event.target.value)} placeholder="Pronađi saputnika" className="h-10" /></div>
      <div className="grid gap-1.5"><Label htmlFor="travel-sort-date">Sortiraj po datumu</Label><select id="travel-sort-date" className={selectClass} value={filters.sort} onChange={(event) => change("sort", event.target.value as TravelFilters["sort"])}><option value="asc">Najraniji prvo</option><option value="desc">Najkasniji prvo</option></select></div>
    </div>
    {filtering ? <Button variant="ghost" size="sm" onClick={() => setFilters(initialFilters)}>Obriši filtere</Button> : null}

    {view === "list" ? <TravelsTable travels={visible} emptyMessage={filtering ? "Nema putovanja za izabrane filtere." : "Još nema putovanja. Dodaj prvo iznad liste."} /> : <TravelCalendar travels={visible} todayKey={todayKey} />}
  </div>;
}

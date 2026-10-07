"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarYearSelect } from "@/components/ui/calendar-year-select";
import { travelRegionLabel, travelStatusLabel, type Travel } from "@/db/schema/travels";
import { monthGrid, travelsOnDate } from "@/lib/travels/view";
import { TravelEditDialog } from "./TravelEditDialog";
import { travelRegionColors, travelStatusColors } from "@/lib/status-colors";

const weekdays = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function readableDate(day: string): string {
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

export function TravelCalendar({ travels, todayKey }: { travels: Travel[]; todayKey: string }) {
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [year, monthNumber] = month.split("-").map(Number);
  const days = monthGrid(year, monthNumber);
  const selectedTrips = travelsOnDate(travels, selectedDay);
  const title = new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

  function navigate(offset: number) {
    const next = shiftMonth(month, offset);
    setMonth(next);
    setSelectedDay(`${next}-01`);
  }

  return <section aria-label="Kalendar putovanja" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold capitalize">{title}</h2>
        <CalendarYearSelect year={year} onYearChange={(nextYear) => {
          const next = `${nextYear}-${month.slice(5)}`;
          setMonth(next);
          setSelectedDay(`${next}-01`);
        }} />
      </div>
      <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => { setMonth(todayKey.slice(0, 7)); setSelectedDay(todayKey); }}>Danas</Button><Button size="icon-sm" variant="outline" onClick={() => navigate(-1)} aria-label="Prethodni mesec"><ChevronLeft className="size-4" /></Button><Button size="icon-sm" variant="outline" onClick={() => navigate(1)} aria-label="Sledeći mesec"><ChevronRight className="size-4" /></Button></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">{weekdays.map((day) => <span key={day} className="px-1 py-2 text-center text-xs font-medium text-muted-foreground">{day}</span>)}</div>
      <div className="grid grid-cols-7">{days.map((day) => {
        const matches = travelsOnDate(travels, day);
        const selected = day === selectedDay;
        return <button key={day} type="button" onClick={() => setSelectedDay(day)} aria-label={`${readableDate(day)}: ${matches.length} putovanja`} aria-pressed={selected} className={`min-w-0 min-h-20 border-b border-r border-border p-1.5 text-left transition hover:bg-accent/50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-28 sm:p-2 ${selected ? "bg-primary/15" : ""} ${day.slice(0, 7) === month ? "" : "text-muted-foreground/60"}`}>
          <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${day === todayKey ? "bg-primary text-primary-foreground" : ""}`}>{Number(day.slice(8))}</span>
          {matches.length > 0 ? <><span className="mt-1 block text-xs font-semibold text-primary sm:hidden">{matches.length} ✦</span><span className="mt-1 hidden space-y-1 sm:block">{matches.slice(0, 2).map((item) => <span key={item.id} className="block truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-xs text-primary" title={item.name}>{item.name}</span>)}{matches.length > 2 ? <span className="block text-xs text-muted-foreground">+{matches.length - 2}</span> : null}</span></> : null}
        </button>;
      })}</div>
    </div>
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-semibold">{readableDate(selectedDay)}</h3>
      {selectedTrips.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nema putovanja za izabrani dan.</p> : <ul className="mt-3 space-y-3">{selectedTrips.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/30 p-3"><div className="min-w-0"><p className="font-medium">{item.name}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-lg border px-2.5 py-1 text-sm ${travelRegionColors[item.region]}`}>{travelRegionLabel[item.region]}</span><span className={`rounded-lg border px-2.5 py-1 text-sm ${travelStatusColors[item.status]}`}>{travelStatusLabel[item.status]}</span>{item.people ? <span className="text-sm text-muted-foreground">{item.people}</span> : null}</div></div><TravelEditDialog travel={item} /></li>)}</ul>}
    </div>
    {travels.some((item) => !item.startDate && !item.endDate) ? <p className="text-xs text-muted-foreground">Putovanja bez datuma dostupna su u prikazu liste.</p> : null}
  </section>;
}

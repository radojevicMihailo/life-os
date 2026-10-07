"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { travelRegionLabel, travelStatusLabel, type Travel, type TravelRegion, type TravelStatus } from "@/db/schema/travels";
import { updateTravel } from "../_actions/travels";

const regions: TravelRegion[] = ["srbija", "okolne_drzave", "evropa", "svet"];
const statuses: TravelStatus[] = ["idea", "planning", "booked", "done"];

export function TravelEditDialog({ travel, compact = false }: { travel: Travel; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(travel.name);
  const [region, setRegion] = useState<TravelRegion>(travel.region);
  const [status, setStatus] = useState<TravelStatus>(travel.status);
  const [startDate, setStartDate] = useState(travel.startDate ?? "");
  const [endDate, setEndDate] = useState(travel.endDate ?? "");
  const [people, setPeople] = useState(travel.people ?? "");
  const [notes, setNotes] = useState(travel.notes ?? "");

  function changeOpen(next: boolean) {
    if (next) {
      setName(travel.name);
      setRegion(travel.region);
      setStatus(travel.status);
      setStartDate(travel.startDate ?? "");
      setEndDate(travel.endDate ?? "");
      setPeople(travel.people ?? "");
      setNotes(travel.notes ?? "");
    }
    setOpen(next);
  }

  function submit() {
    if (startDate && endDate && endDate < startDate) {
      toast.error("Datum završetka mora biti posle početka.");
      return;
    }
    startTransition(async () => {
      const result = await updateTravel({
        id: travel.id, name: name.trim(), region, status,
        startDate: startDate || null, endDate: endDate || null,
        people: people.trim() || null, notes: notes.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Putovanje je sačuvano.");
      setOpen(false);
      router.refresh();
    });
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>
      {compact ? <Button size="icon-sm" variant="ghost" aria-label={`Uredi ${travel.name}`}><Pencil className="size-4" /></Button> : <Button size="sm" variant="outline"><Pencil className="size-4" /> Uredi</Button>}
    </DialogTrigger>
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Uredi putovanje</DialogTitle><DialogDescription>Izmeni plan, datume i saputnike.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor={`travel-name-${travel.id}`}>Naziv</Label><Input id={`travel-name-${travel.id}`} value={name} onChange={(event) => setName(event.target.value)} required maxLength={500} disabled={pending} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor={`travel-region-${travel.id}`}>Region</Label><select id={`travel-region-${travel.id}`} value={region} onChange={(event) => setRegion(event.target.value as TravelRegion)} disabled={pending} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">{regions.map((item) => <option value={item} key={item}>{travelRegionLabel[item]}</option>)}</select></div>
          <div className="grid gap-2"><Label htmlFor={`travel-status-${travel.id}`}>Status</Label><select id={`travel-status-${travel.id}`} value={status} onChange={(event) => setStatus(event.target.value as TravelStatus)} disabled={pending} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">{statuses.map((item) => <option value={item} key={item}>{travelStatusLabel[item]}</option>)}</select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor={`travel-start-${travel.id}`}>Početak</Label><Input id={`travel-start-${travel.id}`} type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setEndDate(event.target.value); }} disabled={pending} /></div>
          <div className="grid gap-2"><Label htmlFor={`travel-end-${travel.id}`}>Kraj</Label><Input id={`travel-end-${travel.id}`} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate || undefined} disabled={pending} /></div>
        </div>
        <div className="grid gap-2"><Label htmlFor={`travel-people-${travel.id}`}>Ljudi</Label><Input id={`travel-people-${travel.id}`} value={people} onChange={(event) => setPeople(event.target.value)} placeholder="Imena saputnika" maxLength={1000} disabled={pending} /></div>
        <div className="grid gap-2"><Label htmlFor={`travel-notes-${travel.id}`}>Beleške</Label><Textarea id={`travel-notes-${travel.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={10000} disabled={pending} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Otkaži</Button><Button type="submit" disabled={pending || !name.trim()}>{pending ? "Čuvanje..." : "Sačuvaj"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  travelRegionLabel,
  travelStatusLabel,
  type TravelRegion,
  type TravelStatus,
} from "@/db/schema/travels";
import { createTravel } from "../_actions/travels";

const REGIONS: TravelRegion[] = ["srbija", "okolne_drzave", "evropa", "svet"];
const STATUSES: TravelStatus[] = ["idea", "planning", "booked", "done"];

export function TravelQuickAdd() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<TravelRegion>("srbija");
  const [status, setStatus] = useState<TravelStatus>("idea");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [people, setPeople] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await createTravel({
        name: trimmed,
        region,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        people: people.trim() || null,
      });
      if (r.ok) {
        setName("");
        setStartDate("");
        setEndDate("");
        setPeople("");
        setRegion("srbija");
        setStatus("idea");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex w-full flex-wrap items-center gap-2 rounded-md border bg-card p-3"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Destination"
        disabled={pending}
        className="min-w-40 flex-1"
      />
      <Select value={region} onValueChange={(v) => setRegion(v as TravelRegion)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REGIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {travelRegionLabel[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setStatus(v as TravelStatus)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {travelStatusLabel[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        disabled={pending}
        className="w-40"
      />
      <Input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        disabled={pending}
        className="w-40"
      />
      <Input
        value={people}
        onChange={(e) => setPeople(e.target.value)}
        placeholder="People"
        disabled={pending}
        className="w-40"
      />
      <Button type="submit" size="sm" disabled={pending || !name.trim()} className="gap-1">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}

"use client";

import {useId, useRef, useState} from "react";
import {Check, ChevronDown} from "lucide-react";
import type {Exercise, ExerciseGroup} from "@/db/schema/physical";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

export function ExercisePicker({value, exercises, groups, onChange, placeholder = "Izaberi vežbu"}: {
  value: string | null;
  exercises: Exercise[];
  groups: ExerciseGroup[];
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = exercises.find(exercise => exercise.id === value);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("sr-Latn");
  const options = exercises.filter(exercise =>
    (!exercise.archivedAt || exercise.id === value) &&
    (!group || exercise.groupId === group) &&
    normalize(exercise.name).includes(normalize(search.trim()))
  );
  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
  }
  return <div className="space-y-2">
    <label id={`${id}-label`} className="block text-sm font-medium">Vežba</label>
    <Popover open={open} onOpenChange={next => {setOpen(next); if (next) {setSearch(""); setGroup("");}}}>
      <PopoverTrigger asChild>
        <button type="button" data-slot="select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-controls={`${id}-list`} aria-expanded={open} aria-haspopup="listbox" className="flex w-full items-center justify-between gap-3 text-left">
          <span id={`${id}-value`} className="min-w-0 truncate">{selected ? `${selected.name}${selected.archivedAt ? " (arhivirana)" : ""}` : placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)]" onOpenAutoFocus={event => {event.preventDefault(); input.current?.focus();}}>
        <Input ref={input} aria-label="Pretraži vežbe" placeholder="Pretraži vežbe…" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => {
          if (event.key === "ArrowDown") {event.preventDefault(); optionsRef.current[0]?.focus();}
        }} />
        <select aria-label="Grupa vežbi" className="w-full" value={group} onChange={event => setGroup(event.target.value)}>
          <option value="">Sve grupe</option>
          {groups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <div id={`${id}-list`} role="listbox" aria-label="Vežbe" className="max-h-64 overflow-y-auto">
          {[{id: null, name: "Bez izbora", archivedAt: null}, ...options].map((exercise, index) => <button key={exercise.id ?? "none"} ref={element => {optionsRef.current[index] = element;}} type="button" role="option" aria-selected={exercise.id === value} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none" onClick={() => choose(exercise.id)} onKeyDown={event => {
            const next = event.key === "ArrowDown" ? Math.min(index + 1, options.length) : event.key === "ArrowUp" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? options.length : null;
            if (next != null) {event.preventDefault(); if (next < 0) input.current?.focus(); else optionsRef.current[next]?.focus();}
          }}>
            <Check className={`size-4 shrink-0 ${exercise.id === value ? "opacity-100" : "opacity-0"}`} />
            <span>{exercise.name}{exercise.archivedAt ? " (arhivirana)" : ""}</span>
          </button>)}
          {!options.length && <p className="px-3 py-2 text-sm text-muted-foreground">Nema vežbi za ovu pretragu.</p>}
        </div>
      </PopoverContent>
    </Popover>
  </div>;
}

"use client";
import {useState} from "react";
import type {Exercise,ExerciseGroup} from "@/db/schema/physical";
import type {SetEntry,TrainingBlock} from "@/lib/physical/types";
import {Input} from "@/components/ui/input";
import {SetArrayInput} from "../SetArrayInput";
export function ExerciseFields({block,exercises,groups,onChange,onExerciseChange}:{block:TrainingBlock;exercises:Exercise[];groups:ExerciseGroup[];onChange:(values:Record<string,unknown>)=>void;onExerciseChange:(id:string|null)=>void}){
 const [search,setSearch]=useState(""),[group,setGroup]=useState("");
 const options=exercises.filter(e=>e.id===block.exerciseId||(!e.archivedAt&&(!group||e.groupId===group)&&e.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 return <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Pretraži vežbe" placeholder="Pretraži vežbe…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Grupa vežbi" className="h-10 rounded-lg border bg-background px-3 text-sm" value={group} onChange={e=>setGroup(e.target.value)}><option value="">Sve grupe</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div><label className="block space-y-2 text-sm font-medium">Vežba<select className="h-12 w-full rounded-lg border bg-background px-3 text-base" value={block.exerciseId??""} onChange={e=>onExerciseChange(e.target.value||null)}><option value="">Izaberi vežbu</option>{options.map(ex=><option key={ex.id} value={ex.id}>{ex.name}{ex.archivedAt?" (arhivirana)":""}</option>)}</select></label><SetArrayInput value={(block.values.sets as SetEntry[]|undefined)??[]} onChange={sets=>onChange({...block.values,sets})}/></div>;
}

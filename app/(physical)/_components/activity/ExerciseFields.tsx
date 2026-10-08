"use client";
import type {Exercise,ExerciseGroup} from "@/db/schema/physical";
import type {SetEntry,TrainingBlock} from "@/lib/physical/types";
import {ExercisePicker} from "./ExercisePicker";
import {SetArrayInput} from "../SetArrayInput";
export function ExerciseFields({block,exercises,groups,onChange,onExerciseChange}:{block:TrainingBlock;exercises:Exercise[];groups:ExerciseGroup[];onChange:(values:Record<string,unknown>)=>void;onExerciseChange:(id:string|null)=>void}){
 const recorded=(block.values.sets as SetEntry[]|undefined)??[];
 const targetCount=Math.min(99,block.details.targets.setCount?.min??0);
 const displaySets=recorded.length?recorded:Array.from({length:targetCount},()=>block.details.targets.durationSec?{durationSec:0}:{reps:0});
 return <div className="space-y-4"><ExercisePicker value={block.exerciseId} exercises={exercises} groups={groups} onChange={onExerciseChange}/><SetArrayInput value={displaySets} onChange={sets=>onChange({...block.values,sets})}/></div>;
}

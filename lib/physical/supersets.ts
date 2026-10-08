import type {TrainingBlock} from "./types";
export function supersetLabels(blocks:TrainingBlock[]):(string|null)[]{
 const labels:(string|null)[]=blocks.map(()=>null);
 let group=0;
 for(let i=0;i<blocks.length;i++){
  if(blocks[i].kind!=="exercise"||!blocks[i].details.linkNext||blocks[i+1]?.kind!=="exercise")continue;
  const letter=String.fromCharCode(65+group++);let position=1;
  labels[i]=`${letter}${position++}`;
  while(blocks[i].details.linkNext&&blocks[i+1]?.kind==="exercise")labels[++i]=`${letter}${position++}`;
 }
 return labels;
}

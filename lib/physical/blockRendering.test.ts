import {createElement} from "react";
import {renderToString} from "react-dom/server";
import {expect,it} from "vitest";
import {BlockCard} from "@/app/(physical)/_components/activity/BlockCard";
import {newBlock} from "./blocks";
it("renders the same initial card markup across server and client draft identities",()=>{
 const render=()=>renderToString(createElement(BlockCard,{block:newBlock("split"),index:0,count:1,onMove:()=>{},onRemove:()=>{},onDuplicate:()=>{}},"Unos"));
 expect(render()).toEqual(render());
});
